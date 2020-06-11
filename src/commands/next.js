const db = require(__basedir + '/src/utils/database/db.js');
const moment = require(__basedir + '/src/utils/moment.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (message.channel.type = 'dm') {
        return message.reply('You can check upcoming events across your servers at <https://voluspa.app/events>');
      }

      let user = await db.users.getByDiscordId(message.author.id);
      let messageString = '';

      let events = await db.events.getNext(message.guild.id);

      for (let i = 0; i < events.length; i++) {
        let event = events[i];
        messageString += `**${event.join_code}**: \`${event.fireteam.split(',').length}/6 - ${(event.start_time ? `${moment(event.start_time).tz((user ? user.timezone : 'UTC')).format('MMM Do [@] HH:mm z')}` : 'Not scheduled')}${event.fireteam.split(',').includes(message.author.id) ? ' - Joined' : ''}${event.private ? ' - 🔒' : ''}\`${event.note ? `\n • \`${event.note}\``:''}\n`;
      }

      message.channel.send((messageString ? `Upcoming events:\n${messageString.trim()}` : 'No events scheduled.'));
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Show the next 3 events in this server.'
};