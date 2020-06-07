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
    //domain: 'voluspa.app',
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
    const discordGuilds = await discordApi('https://discordapp.com/api/users/@me/guilds', token.access_token);
    discordData.guilds = [];
    discordGuilds.forEach(guild => {
      discordData.guilds.push({
        id: guild.id,
        icon: guild.icon
      })
    });

    const dbData = await db.users.getByDiscordId(discordData.id);
    if (dbData) {
      discordData.timezone = dbData.timezone;
    } else {
      await db.users.post(discordData.id, 'Etc/UTC');
      discordData.timezone = 'Etc/UTC';
    }
    console.log(discordData);
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
