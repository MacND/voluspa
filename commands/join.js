module.exports = {
  run: async (client, message, args) => {
    try {
      if (!args[0]) {
        return message.reply('Please supply an event join code.');
      }

      let event = await client.db.events.getByJoinCode(args[0]);

      if (!event) {
        return message.reply('Could not find an event with the supplied join code.');
      }

      let user = await client.db.users.getByDiscordId(message.author.id);

      if (!user) {
        return message.reply(`You are not registered - please use the ${client.config.prefix}register command and try again.`);
      }

      let fireteam = await client.db.fireteams.getByEventId(event.id);
      let reserve = (fireteam.discord_id.split(',').length >= 6) ? 1 : 0;

      if (fireteam.discord_id.split(',').indexOf(message.author.id) != -1) {
        return message.reply('You are already a member of this event.');
      }

      await client.db.fireteams.put(message.author.id, event.id, reserve);
      
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Join an event.  Requires a valid event join code - if the event is full, you will be automatically waitlisted.'
};