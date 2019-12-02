const Discord = require('discord.js');
const db = require(__basedir + '/utils/database/db.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (!args[0]) {
        let activities = await db.activities.get();
        message.channel.send(`Available activities: ${activities.map(elem => elem.nickname).join(', ')}.`);
        return;
      }

      let activity = await db.activities.getByNickname(args[0].toLowerCase());

      if (!activity) {
        message.channel.send(`Couldn't find an activity with nickname ${args[0]}`);
        return;
      }

      let embed = new Discord.MessageEmbed().
        setTitle(`${activity.name}`).
        setColor(5517157).
        setDescription(activity.tagline).
        attachFiles([__basedir + `/img/${activity.nickname}.png`]).
        setThumbnail(`attachment://${activity.nickname}.png`).
        setFooter(`Gather your Fireteam - !make ${activity.nickname}`);

      message.channel.send(embed);
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Get information about activities.  `!activityinfo` with no arguments lists all available activities, `!activityinfo` with an activity nickname shows extended information.'
};