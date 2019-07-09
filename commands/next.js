let moment = require(__basedir + '/utils/moment.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      let user = await client.db.users.getByDiscordId(message.author.id);
      let events = await client.db.events.getNext();
      let messageString = '';

      for (let i = 0; i < events.length; i++) {
        let event = events[i];
        messageString += `**${event.join_code}** (${event.name})\n\`\`\`• Starting: ${(event.start_time ? `${moment(event.start_time).tz((user ? user.timezone : 'UTC')).format('MMMM Do [@] HH:mm z')}` : 'Not Set')}\n• Fireteam: ${event.fireteam.split(',').length}/6 ${event.private ? '🔒' : ''}\`\`\`\n`;
      }

      message.channel.send((messageString ? `Upcoming events:\n${messageString.trim()}` : 'No events scheduled.'));
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Show the next 3 events.'
};