const db = require(__basedir + '/utils/database/db.js');
const moment = require(__basedir + '/utils/moment.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      let user = await db.users.getByDiscordId(message.author.id);
      let messageString = '';
      let filter;

      if (args[0]) {
        filter = `%${client.users.find(user => user.username.toLowerCase() === args[0].toLowerCase()).id}%`;
      }

      let events = await db.events.getNext(filter);

      for (let i = 0; i < events.length; i++) {
        let event = events[i];
        messageString += `**${event.join_code}** (${event.name})\n\`\`\`• Starting: ${(event.start_time ? `${moment(event.start_time).tz((user ? user.timezone : 'UTC')).format('MMMM Do [@] HH:mm z')}` : 'Not Set')}\n• Fireteam: ${event.fireteam.split(',').length}/6 ${event.private ? '🔒' : ''} ${event.note ? `\n• Note: ${event.note}`:''}\`\`\`\n`;
      }

      message.channel.send((messageString ? `Upcoming events:\n${messageString.trim()}` : 'No events scheduled.'));
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Show the next 3 events.  You can include a Discord username as an argument to view events that user has joined.'
};