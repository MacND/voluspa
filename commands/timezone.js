const db = require(__basedir + '/utils/database/db.js');
const moment = require(__basedir + '/utils/moment.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (!args[0]) {
        message.reply('please provide a timezone.');
        return;
      }

      let timezone = args[0];

      if (!moment.tz.zone(timezone)) {
        message.reply('Invalid timezone supplied.');
        return;
      }

      let user = await db.users.getByDiscordId(message.author.id);

      if (!user) {
        message.channel.send('Unable to find user - have you registered?');
        return;
      }

      if (timezone === user.timezone) {
        message.reply(`your timezone username is already set to ${user.timezone}.`);
        return;
      }

      await db.users.putTimezone(message.author.id, timezone);
      message.react('✅');
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Add your timezone username to the database.  This must be a valid ISO timezone, a list of which can be found here - https://en.wikipedia.org/wiki/List_of_tz_database_time_zones.'
};