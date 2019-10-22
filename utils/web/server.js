const fastify = require('fastify');
const axios = require('axios');
const btoa = require('btoa');
const config = require(__basedir + '/config/discord.json');
const db = require(__basedir + '/utils/database/db.js');
const app = fastify();
const path = require('path');

app.register(require('fastify-static'), {
  root: path.join(__basedir, 'utils/web/www'),
  prefix: '/', // optional: default '/'
});

app.listen(config.redirect_port, async () => {
  console.info(`Running on port ${config.redirect_port}`);
});

app.get('/', async (req, res) => {
  res.sendFile('index.html');
});

app.get('/oauth/redirect', async (req, res) => {
  let requestToken = req.query.code;
  let creds = btoa(`${config.client_id}:${config.client_secret}`);
  let response = await axios({
    method: 'post',
    url: `https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${requestToken}&redirect_uri=${config.redirect_uri}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${creds}`
    }
  });

  let accessToken = response.data.access_token;
  let refreshToken = response.data.refresh_token;
  console.log(`Access: ${accessToken}\nRefresh: ${refreshToken}`);
  let discordResponse = await axios({
    method: 'get',
    url: 'https://discordapp.com/api/users/@me',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${accessToken}`
    }
  });
  console.log(`${discordResponse.data.id}`);
  res.redirect('/login_successful.html');
});

/*
app.get('/oauth/redirect', async (req, res) => {
  try {
    console.log(req.query.code);
    let code = req.query.code;
    //let creds = btoa(`${config.client_id}:${config.client_secret}`);
    //console.log(creds);
    let authResponse  = await axios.post(`https://discordapp.com/api/v6/oauth2/token`,
      {
        client_id: config.client_id,
        client_secret: config.client_secret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `http://localhost:443/oauth/redirect`,
        scope: 'identify connections',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log(authResponse);
    /*
    let accessToken = authResponse.data.access_token;
    let refreshToken = authResponse.data.refresh_token;
    let accessResponse = await axios.get('https://discordapp.com/api/users/@me',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${accessToken}`
      }
    });
    
  } catch (err) {
    throw new Error(err);
  }
});

app.get('/oauth/redirect', (req, res) => {
  let requestToken = req.query.code;
  let creds = btoa(`${config.client_id}:${config.client_secret}`);
  let response = axios({
    method: 'post',
    url: `https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${requestToken}&redirect_uri=${config.redirect_uri}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${creds}`
    }
  }).then((response) => {
    let accessToken = response.data.access_token;
    let refreshToken = response.data.refresh_token;
    console.log(`Access: ${accessToken}\nRefresh: ${refreshToken}`);
    let discordResponse = axios({
      method: 'get',
      url: 'https://discordapp.com/api/users/@me',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${accessToken}`
      }
    }).then((discordResponse) => {
      
    });
  });
});
*/