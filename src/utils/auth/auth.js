const fs = require('fs');
const fastify = require('fastify')();
const fastifyOauth = require('fastify-oauth2');

const axios = require('axios');
const path = require('path');
const config = require(__basedir + '/src/config/discord.json');
const db = require(__basedir + '/src/utils/database/db.js');

fastify.register(require('fastify-secure-session'), {
  key: fs.readFileSync(path.join(__basedir, 'src/config/secret-key')),
  cookie: {
    //domain: 'voluspa.app'
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

fastify.get('/', (req, res) => {
  try {
    return res.view('index.ejs',
      {
        "userData": req.session.get('userData')
      }
    );
  } catch (err) {
    console.log(err);
    return res.view('/error.ejs',
      {
        "errorMessage": err
      }
    );
  }
});

fastify.get('/auth/discord/callback', async function (req, res, client) {
  try {
    const token = await fastify.discordOauth.getAccessTokenFromAuthorizationCodeFlow(req);

    const user = await axios({
      method: 'get',
      url: 'https://discordapp.com/api/users/@me',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token.access_token}`
      }
    });

    req.session.set('userData', user.data);
    const registeredUser = await db.users.getByDiscordId(user.data.id);
    
    res.redirect('/');

/*     if (!registeredUser) {
      // also send the user a DM on Discord - this is gonna require dependency injection, so I should redo all the routes as their own files
      return res.redirect('/profile');
    } else {
      return res.redirect('/profile');
    } */

  } catch (err) {
    console.log(err);
    return res.view('/error.ejs',
      {
        "errorMessage": err
      }
    );
  }
});

fastify.get('/profile.ejs', async (req, res) => {
  try {
    const userData = req.session.get('data');
    if (!userData) {
      return res.redirect('/auth/discord');
    }

    const registeredUserData = await db.users.getByDiscordId(userData.id);

    return res.view('profile.ejs',
      {
        "registeredUserData": registeredUserData,
        "userData": userData
      }
    );

  } catch (err) {
    console.log(err);
    return res.view('/error.ejs',
      {
        "errorMessage": err
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
        "errorMessage": err
      }
    );
  }
});

fastify.listen(config.redirect_port, async () => {
  console.info(`Running on port ${config.redirect_port}`);
});
