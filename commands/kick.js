const db = require(__basedir + '/utils/database/db.js');

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

      if (!args[1]) {
        return message.reply('Please supply a username to kick from the event.');
      }

      let searchUserId = client.users.find(user => user.username.toLowerCase() === args[1].toLowerCase()).id;
    
      if (searchUserId === message.author.id) {
        return message.reply('You cannot kick yourself from an event.');
      }
    
      let fireteam = await db.fireteams.getByEventId(event.id);
      let fireteamAdmins = await db.fireteams.getAdminsByEventId(event.id);

      if (!fireteamAdmins.discord_id.split(',').includes(message.author.id)) {
        return message.reply('Only admins can kick people from events');
      }

      if (!fireteam.discord_id.split(',').includes(searchUserId)) {
        return message.reply('The user you are trying to kick is not a member of this event.');
      }

      await db.fireteams.deleteMember(searchUserId, event.id);

    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Kick a user from an event.  You must be an admin for the event from which you\'re trying to kick someone.'
};