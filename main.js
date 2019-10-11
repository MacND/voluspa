global.__basedir = __dirname;

const Discord = require('discord.js');
const Enmap = require('enmap');
const fs = require('fs');
const express = require('express');
const path = require('path');
const app = express();

const client = new Discord.Client({ disableEveryone: true });
const config = require(__basedir + '/config/discord.json');
client.config = config;

fs.readdir(__basedir + '/events/', (err, files) => {
  if (err) return console.error(err);
  files.forEach(file => {
    const event = require(__basedir + `/events/${file}`);
    let eventName = file.split('.')[0];
    client.on(eventName, event.bind(null, client));
  });
});

client.commands = new Enmap();

fs.readdir(__basedir + '/commands/', (err, files) => {
  if (err) return console.error(err);
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    let props = require(__basedir + `/commands/${file}`);
    let commandName = file.split('.')[0];
    console.log(`Attempting to load command ${commandName}`);
    client.commands.set(commandName, props);
  });
});

app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
  res.status(200).sendFile(__basedir + '/utils/auth/index.html');
});

app.listen(8443, () => {
  console.info('Running on port 8443');
});

// Routes
app.use('/discord', require('./utils/auth/discord'));

app.use((err, req, res, next) => {
  switch (err.message) {
  case 'NoCodeProvided':
    return res.status(400).send({
      status: 'ERROR',
      error: err.message,
    });
  default:
    return res.status(500).send({
      status: 'ERROR',
      error: err.message,
    });
  }
});

client.login(config.token);
