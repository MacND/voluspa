const db = require(__basedir + '/utils/database/db.js');
const moment = require(__basedir + '/utils/moment.js');

module.exports = {
  run: async (client, message, args) => {
    const notify = require(__basedir + '/utils/notify.js')(client);
    try {
      if (!args[0]) {
        return message.reply('Please supply an event join code.');
      }

      let event = await db.events.getByJoinCode(args[0]);

      if (!event) {
        return message.reply('Unable find an event with the supplied join code.');
      }

      let eventAdmins = await db.fireteams.getAdminsByEventId(event.id);
 
      if (!eventAdmins.discord_id.split(',').includes(message.author.id)) {
        return message.reply('You are not an admin for this event.');
      }

      let suggestion = args.slice(1).join(' ');

      if (!suggestion) {
        return message.reply('No start time supplied.');
      }

      let user = await db.users.getByDiscordId(message.author.id);
      let suggestedDateTime = moment(suggestion, ['MMM DD HH:mm', 'MMM DD h:mma', 'dddd HH:mm', 'dddd h:mma',  'HH:mm', 'h:mma', 'ha']);
      let offset = moment.tz(suggestedDateTime, user.timezone).utcOffset();
      suggestedDateTime.utcOffset(offset, true);
      
      if (suggestedDateTime < moment().tz(user.timezone)) {
        suggestedDateTime.add(7, 'd');
      }

      await db.events.putStartTime(suggestedDateTime.utc().format('YYYY-MM-DD HH:mm'), event.id);
      let fireteam = await db.fireteams.getByEventId(event.id);
      notify.pingUsers(fireteam.discord_id.split(','), `${event.join_code} has now been scheduled for ${suggestedDateTime.utc().format('MMMM Do [@] HH:mm z')}.`);
      notify.pingUsersBeforeEvent(fireteam.discord_id.split(','), `In 10 minutes you are scheduled to take part in **${event.join_code}**.  Please proceed to orbit and join up with your fireteam.`, suggestedDateTime.utc(), event.join_code);
      message.react('✅');
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Set a start time for an event.  Specifiy a join code, and a start time in one of the following formats: ```\nJanuary 1 12:00\nJanuary 1 12:00pm\nMonday 12:00\nMonday 12:00pm\n12:00\n12:00pm```'
};
