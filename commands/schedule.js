let moment = require(__basedir + '/utils/moment.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (!args[0]) {
        return message.reply('Please supply an event join code.');
      }

      let event = await client.db.events.getByJoinCode(args[0]);

      if (!event) {
        return message.reply('Unable find an event with the supplied join code.');
      }

      let eventAdmins = await client.db.fireteams.getAdminsByEventId(event.id);
 
      if (!eventAdmins.discord_id.split(',').includes(message.author.id)) {
        return message.reply('You are not an admin for this event.');
      }

      if (!args[1] && !args[2]) {
        return message.reply('Invalid day and time supplied.');
      }

      let user = await client.db.users.getByDiscordId(message.author.id);
      moment.tz.setDefault(user.timezone);
      let suggestedDateTime = moment.tz(moment(args[2], 'HH:mm').day(args[1]), user.timezone);
      moment.tz.setDefault();

      await client.db.events.putStartTime(suggestedDateTime.format('YYYY-MM-DD HH:mm'), event.join_code);
      message.reply(`Set start time of ${event.join_code} to ${suggestedDateTime.format('MMMM Do [@] HH:mm')} UTC`);
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Set a start time for an event.  Specifiy a join code, day (Monday-Sunday) and a time (24hr format), e.g. `Monday 18:00`.'
};