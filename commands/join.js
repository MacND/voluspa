const db = require(__basedir + '/utils/database/db.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      const notify = require(__basedir + '/utils/notify.js')(client);
      if (!args[0]) {
        return message.reply('Please supply an event join code.');
      }

      let event = await db.events.getByJoinCode(args[0]);

      if (!event) {
        return message.reply('Could not find an event with the supplied join code.');
      }

      let user = await db.users.getByDiscordId(message.author.id);

      if (!user) {
        return message.reply(`You are not registered - please use the ${client.config.prefix}register command and try again.`);
      }

      let fireteam = await db.fireteams.getByEventId(event.id);
      let reserve = (fireteam.discord_id.split(',').length >= 6) ? 1 : 0;

      if (fireteam.discord_id.split(',').indexOf(message.author.id) != -1) {
        return message.reply('You are already a member of this event.');
      }

      await db.fireteams.put(message.author.id, event.id, reserve);

      if (reserve) { 
        message.author.send('You have been added to the waitlist for this raid as it is currently full.');
      } 

      fireteam = await db.fireteams.getByEventId(event.id);
      console.log(event.start_time);
      if (event.start_time) {
        notify.pingUsersBeforeEvent(fireteam.discord_id.split(','), `In 10 minutes you are scheduled to take part in **${event.join_code}**.  Please proceed to orbit and join up with your fireteam.`, event.start_time, event.join_code);
      }
      
      message.react('✅');
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Join an event.  Requires a valid event join code - if the event is full, you will be automatically waitlisted.'
};