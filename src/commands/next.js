const db = require(__basedir + '/src/utils/database/db.js');
const moment = require(__basedir + '/src/utils/moment.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      let user = await db.users.getByDiscordId(message.author.id);
      let messageString = '';
      let filterUser;
      let filter;

      if (args[0]) {
        filterUser = client.users.cache.find(user => user.username.toLowerCase() === args[0].toLowerCase());
        if (!filterUser) {
          return message.reply(`Couldn't find user ${args[0]}.`);
        }
        filter = `%${filterUser.id}%`;
      }

      let events = await db.events.getNext(filter, message.guild.id);

      for (let i = 0; i < events.length; i++) {
        let event = events[i];
        messageString += `**${event.join_code}**: \`${event.fireteam.split(',').length}/6 - ${(event.start_time ? `${moment(event.start_time).tz((user ? user.timezone : 'UTC')).format('MMM Do [@] HH:mm z')}` : 'Not scheduled')}${event.fireteam.split(',').includes(message.author.id) ? ' - Joined' : ''}${event.private ? ' - 🔒' : ''}\`${event.note ? `\n • \`${event.note}\``:''}\n`;
      }

      message.channel.send((messageString ? `Upcoming events${(filterUser ? ` for ${filterUser.username}`:'')}:\n${messageString.trim()}` : 'No events scheduled.'));
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Show the next 3 events.  You can include a Discord username as an argument to view events that user has joined.'
};