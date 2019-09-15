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

      let fireteam = await db.fireteams.getByEventId(event.id); 
      let messageString = '';
      for (let i = 0, len = fireteam.discord_id.split(',').length; i< len; i++) {
        let member = fireteam.discord_id.split(',')[i];
        messageString += `${client.users.get(member).username}\n`;
      }

      message.reply(`Fireteam for ${event.join_code}:\n\`\`\`\n${messageString}\`\`\``);

    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Show all fireteam members for a specified event.  Requires a valid event join code.'
};