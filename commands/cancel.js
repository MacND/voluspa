const db = require(__basedir + '/utils/database/db.js');

module.exports = {
  run: async (client, message, args) => {
    const notify = require(__basedir + '/utils/notify.js')(client);
    try {
      if (!args[0]) {
        return message.reply('Please supply an event join code.');
      }

      let event = await db.events.getByJoinCode(args[0]);

      if (!event) {
        return message.reply('Could not find an event with the supplied join code.');
      }

      let fireteam = await db.fireteams.getByEventId(event.id);
      let fireteamAdmins = await db.fireteams.getAdminsByEventId(event.id);

      if (!fireteamAdmins.discord_id.split(',').includes(message.author.id)) {
        return message.reply('Only admins can cancel events.');
      }

      await db.events.delete(event.id);
      await db.fireteams.delete(event.id);
      notify.pingUsers(fireteam.discord_id.split(','), `The event ${event.join_code} has been cancelled.`);
      notify.cancelTimer(event.join_code);
      message.react('✅');
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Cancel an event and remove its fireteam.  Requires a valid event join code.  You must be an admin of the event you are trying to cancel.'
};