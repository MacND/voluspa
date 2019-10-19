const db = require(__basedir + '/utils/database/db.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (!args[0]) {
        return message.reply('Please supply an event join code.');
      }

      let event = await db.events.getByJoinCode(args[0]);

      if (!event) {
        return message.reply('Could not find an event with the supplied join code.');
      }
      let eventAdmins = await db.fireteams.getAdminsByEventId(event.id);
 
      if (!eventAdmins.discord_id.split(',').includes(message.author.id)) {
        return message.reply('You are not an admin for this event.');
      }
      
      await db.events.putRaidReport(args[1], event.id);
      message.react('✅');
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Associate a raid report URL with an event.',
  aliases: ['raidreport']
};