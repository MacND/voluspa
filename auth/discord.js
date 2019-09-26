const express = require('express');
const fetch = require('node-fetch');
const btoa = require('btoa');
const config = require('../config/discord.json');

const router = express.Router();
const redirect = encodeURIComponent(config.redirect_uri);

router.get('/login', (req, res) => {
  res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${config.client_id}&scope=identify%20connections&response_type=code&redirect_uri=${redirect}`);
});

router.get('/callback', async (req, res) => {
  if (!req.query.code) throw new Error('NoCodeProvided');
  const code = req.query.code;
  const creds = btoa(`${config.client_id}:${config.client_secret}`);
  const response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
      },
    });
  const json = await response.json();
  res.redirect(`/?token=${json.access_token}`);
  console.log(json);
});

module.exports = router;