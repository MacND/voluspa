global.__basedir = __dirname;

const Discord = require('discord.js');
const Enmap = require('enmap');
const fs = require('fs');
const dbpool = require(__basedir + '/utils/dbpool.js');

const client = new Discord.Client({ disableEveryone: true });
const config = require(__basedir + '/config/discord.json');
client.config = config;
client.dbpool = dbpool;

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

client.login(config.token);
