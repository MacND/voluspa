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

      let nextAdmin = await client.db.fireteams.getNextAdmin(event.id, message.author.id);
    
      if (!nextAdmin) {
        return message.reply('Unable to leave event as you are the only admin - give another fireteam member admin rights or cancel the event.');
      }
    
      await client.db.fireteams.deleteMember(message.author.id, event.id);

    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Leave an event.  You must not be the last admin of an event to use this command.'
};