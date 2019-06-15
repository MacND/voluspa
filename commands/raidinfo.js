const Discord = require('discord.js');
const moment = require(`${__basedir}/utils/moment.js`);

module.exports = {
  run: async (client, message, args) => {
    try {
      let [
        rows,
        fields
      ] = await client.dbpool.query('SELECT * FROM activities;');
      let activities = rows;

      if (!args[0]) {
        message.channel.send(`Available raids: ${activities.map(elem => elem.shortName).join(', ')}.`);

        return;
      }

      let activity = activities.find(o => o.shortName == args[0].toLowerCase());

      if (!activity) {
        message.channel.send(`Couldn't find an activity with raidId ${args[0]}`);

        return;
      }

      let embed = new Discord.RichEmbed().
        setTitle(`${activity.name} (${activity.type})`).
        setColor(5517157).
        setDescription(`*"${activity.tagline}"*\n${activity.description}\n\`\`\`Short code: ${activity.shortName}\nRecommended power: ${activity.recommendedPower}\nBeginner estimate: ${moment().startOf('day').seconds(activity.beginnerEstimate).format('H:mm')}\n\`\`\``).
        setURL(`${activity.wikiUrl}`).
        setThumbnail(`https://gamezone.cool/img/${activity.shortName}.png`).
        setFooter(`Gather your Fireteam - !make ${activity.shortName}`);

      message.channel.send(embed);
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Get information about raids.  `!raidinfo` with no arguments lists all available raids, `!raidinfo` with a raidID shows information such as recommended power, estimated time, and more.'
};