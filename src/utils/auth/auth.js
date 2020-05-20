const fs = require('fs'); 
const fastify = require('fastify')();
const fastifyOauth = require('fastify-oauth2');
const fastifyCookie = require('fastify-cookie');

const axios = require('axios');
const path = require('path');
const config = require(__basedir + '/src/config/discord.json');
const db = require(__basedir + '/src/utils/database/db.js');

fastify.register(require('fastify-secure-session'), {
  key: fs.readFileSync(path.join(__basedir, 'src/config/secret-key')),
});

fastify.register(require('fastify-static'), {
  root: path.join(__basedir, 'public')
});

fastify.listen(config.redirect_port, async () => {
  console.info(`Running on port ${config.redirect_port}`);
});

fastify.get('/', async (req, res) => {
  res.sendFile('index.html');
});

fastify.register(fastifyOauth, {
  name: 'discordOauth',
  scope: ['identify'],
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
  startRedirectPath: '/auth/discord',
  callbackUri: config.redirect_uri
});

fastify.get('/auth/discord/callback', async function (request, reply) {
  try {
    const token = await fastify.discordOauth.getAccessTokenFromAuthorizationCodeFlow(request);

    let user = await axios({
      method: 'get',
      url: 'https://discordapp.com/api/users/@me',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token.access_token}`
      }
    });

    if (!user) {
      reply.redirect('/auth_failure.html');
    }

    request.session.set('userData', user.data);
    await db.users.putOAuth(user.data.id, token.access_token, token.refresh_token);
    reply.redirect('/auth_success.html');
    
  } catch (err) {
    reply.redirect('/auth_failure.html');
    throw new Error(err);
  }
});

fastify.post('/logout', async function (request, reply) {
  try {
    request.session.delete();
    reply.redirect('/index.html');
  } catch (err) {
    throw new Error(err);
  }
});