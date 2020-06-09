const fs = require('fs');
const fastify = require('fastify')();
const fastifyOauth = require('fastify-oauth2');

const axios = require('axios');
const path = require('path');
const config = require(__basedir + '/src/config/discord.json');
const db = require(__basedir + '/src/utils/database/db.js');
const moment = require(__basedir + '/src/utils/moment.js');


fastify.register(require('fastify-secure-session'), {
  key: fs.readFileSync(path.join(__basedir, 'src/config/secret-key')),
  cookie: {
    domain: 'voluspa.app',
    path: '/'
  }
});

fastify.register(require('fastify-static'), {
  root: path.join(__basedir, 'public')
});

fastify.register(require('point-of-view'), {
  engine: {
    ejs: require('ejs')
  },
  root: path.join(__basedir, 'public')
});

fastify.register(fastifyOauth, {
  name: 'discordOauth',
  scope: ['identify guilds'],
  credentials: {
    client: {
      id: config.client_id,
      secret: config.client_secret
    },
    auth: {
      authorizeHost: 'https://discordapp.com',
      authorizePath: '/api/oauth2/authorize',
      tokenHost: 'https://discordapp.com',
      tokenPath: '/api/oauth2/token'
    }
  },
  startRedirectPath: '/login',
  callbackUri: config.redirect_uri
});

fastify.get('/', async (req, res) => {
  try {
    return res.view('index.ejs',
      {
        'discordData': req.session.get('discordData')
      }
    );
  } catch (err) {
    console.log(err);
    return res.view('/error.ejs',
      {
        'errorMessage': err
      }
    );
  }
});

fastify.get('/auth/discord/callback', async (req, res) => {
  try {

    const token = await fastify.discordOauth.getAccessTokenFromAuthorizationCodeFlow(req);

    const discordApi = async (endpoint, token) => {
      const res = await axios({
        method: 'get',
        url: endpoint,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        }
      });
      return res.data;
    }

    const discordData = await discordApi('https://discordapp.com/api/users/@me', token.access_token);
    discordData.access_token = token.access_token;

    const dbData = await db.users.getByDiscordId(discordData.id);
    if (dbData) {
      discordData.timezone = dbData.timezone;
    } else {
      await db.users.post(discordData.id, 'Etc/UTC');
      discordData.timezone = 'Etc/UTC';
    }

    req.session.set('discordData', discordData);
    return res.redirect('/profile');

  } catch (err) {
    console.log(err);
    return res.view('/error.ejs',
      {
        'errorMessage': err
      }
    );
  }
});

fastify.get('/profile', async (req, res) => {
  try {
    if (!req.session.get('discordData')) {
      return res.redirect('/login');
    }

    return res.view('profile.ejs',
      {
        'discordData': req.session.get('discordData')
      }
    );
  } catch (err) {
    console.log(err);
    return res.view('/error.ejs',
      {
        'errorMessage': err
      }
    );
  }
});

fastify.get('/events', async (req, res) => {
  try {
    if (!req.session.get('discordData')) {
      return res.redirect('/login');
    }

    const discordGuilds = await axios({
      method: 'get',
      url: 'https://discordapp.com/api/users/@me/guilds',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${req.session.get('discordData').access_token}`
      }
    });

    const botGuilds = await axios({
      method: 'get',
      url: 'https://discordapp.com/api/users/@me/guilds',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bot ${config.token}`
      }
    });

    const botGuildIds = new Set(botGuilds.data.map(botGuild => botGuild.id));
    const sharedGuilds = discordGuilds.data.filter(userGuild => botGuildIds.has(userGuild.id));

    await Promise.all(sharedGuilds.map(async (guild) => {
      guild.next = new Array;
      const res = await db.events.getNext(guild.id);
      res.forEach(event => guild.next.push(event));
      return;
    }));

    return res.view('events.ejs',
      {
        'discordData': req.session.get('discordData'),
        'guilds': sharedGuilds,
        moment: moment
      }
    );
  } catch (err) {
    console.log(err);
    return res.view('/error.ejs',
      {
        'errorMessage': err
      }
    );
  }
});

fastify.get('/privacy', async (req, res) => {
  try {
    return res.view('privacy.ejs',
      {
        'discordData': req.session.get('discordData')
      }
    );
  } catch (err) {
    console.log(err);
    return res.view('/error.ejs',
      {
        'errorMessage': err
      }
    );
  }
});

fastify.get('/logout', async (req, res) => {
  try {
    req.session.delete();
    return res.redirect('/');
  } catch (err) {
    console.log(err);
    return res.view('/error.ejs',
      {
        'errorMessage': err
      }
    );
  }
});

fastify.post('/api/users/timezone', async (req, res) => {
  try {
    const cookieData = req.session.get('discordData');
    const timezone = req.body.timezone;

    if (!moment.tz.zone(timezone)) {
      throw new Error(err);
    }

    const response = await db.users.putTimezone(cookieData.id, timezone);
    cookieData.timezone = timezone;
    req.session.set('discordData', cookieData);

    res.redirect('/profile');

  } catch (err) {
    console.log(err);
    return res.view('/error.ejs',
      {
        'errorMessage': err
      }
    );
  }
});

fastify.listen(config.redirect_port, async () => {
  console.info(`Running on port ${config.redirect_port}`);
});
