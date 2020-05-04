const moment = require(__basedir + '/src/utils/moment.js');
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
      let eventAdmins = await db.fireteams.getAdminsByEventId(event.id);
 
      if (!eventAdmins.discord_id.split(',').includes(message.author.id)) {
        return message.reply('You are not an admin for this event.');
      }

      if (moment(event.startTime).utc() > moment.utc()) {
        return message.reply('you cannot finish an event that has not started.');
      } 

      let finishTime = moment.utc().format('YYYY-MM-DD HH:mm');
      
      await db.events.putFinishTime(finishTime, event.id);
      message.react('✅');
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Mark an event as complete.'
};