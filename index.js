global.__basedir = __dirname;

const Discord = require('discord.js');
const Enmap = require('enmap');
const fs = require('fs');

const client = new Discord.Client({ disableEveryone: true });
const config = require(__basedir + '/src/config/discord.json');
client.config = config;

fs.readdir(__basedir + '/src/events/', (err, files) => {
  if (err) return console.error(err);
  files.forEach(file => {
    const event = require(__basedir + `/src/events/${file}`);
    let eventName = file.split('.')[0];
    client.on(eventName, event.bind(null, client));
  });
});

client.commands = new Enmap();

fs.readdir(__basedir + '/src/commands/', (err, files) => {
  if (err) return console.error(err);
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    let props = require(__basedir + `/src/commands/${file}`);
    let commandName = file.split('.')[0];
    console.log(`Attempting to load command ${commandName}`);
    client.commands.set(commandName, props);
    if (props.aliases) {
      props.aliases.forEach(alias => {
        client.commands.set(alias, props);
        console.log(`-- Assigning alias ${alias} to ${commandName}`);
      });
    }
  });
});

try {
  client.login(config.token);
} catch (err) {
  throw new Error(err);
}