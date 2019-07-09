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

      let newAdminId = client.users.find(user => user.username.toLowerCase() === args[1].toLowerCase()).id;

      if (newAdminId === message.author.id) {
        return message.reply('You cannot change your own admin status.');
      }

      let fireteamAdmins = await client.db.fireteams.getAdminsByEventId(event.id);

      if (!fireteamAdmins.discord_id.split(',').includes(message.author.id)) {
        return message.reply('Only admins can kick people from events');
      }

      let fireteam = await client.db.fireteams.getByEventId(event.id);

      if (!fireteam.discord_id.split(',').includes(newAdminId)) {
        return message.reply('The user you are trying to kick is not a member of this event.');
      }

      await client.db.fireteams.putAdmin(newAdminId, event.id);

    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Grant a fireteam member admin permissions.  Amins can schedule/unschedule the event, modify membership of the event, and cancel it.'
};