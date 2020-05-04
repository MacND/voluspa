const db = require(__basedir + '/src/utils/database/db.js');

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
      fireteam = fireteam.discord_id.split(',');
      let fireteamNames = [];

      for (let i = 0, len = fireteam.length; i< len; i++) {
        let member = fireteam[i];
        fireteamNames.push(client.users.cache.get(member).username);
      }

      message.reply(`Fireteam for ${event.join_code}:\n${fireteamNames.sort().join(', ')}`);

    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Show all fireteam members for a specified event.  Requires a valid event join code.'
};