const express = require('express');
const axios = require('axios');
const btoa = require('btoa');
const config = require(__basedir + '/config/discord.json');
const db = require(__basedir + '/utils/database/db.js');
const app = express();

app.use(express.static(__basedir + '/utils/web/www/'));

app.get('/', (req, res) => {
  res.status(200).sendFile(__basedir + '/utils/web/index.html');
});

app.listen(config.redirect_port, () => {
  console.info(`Running on port ${config.redirect_port}`);
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
      console.log(`${discordResponse.data.id}`)
    });
  });
});