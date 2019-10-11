const db = require(__basedir + '/utils/database/db.js');

module.exports = {
  run: async (client, message, args) => {
  try {
    if (!args[0]) {
      return message.reply('Please supply an event join code.');
    }

    let event = await db.events.getByJoinCode(args[0]);

    if (!event) {
      return message.reply('Unable find an event with the supplied join code.');
    }

    let eventAdmins = await db.fireteams.getAdminsByEventId(event.id);

    if (!eventAdmins.discord_id.split(',').includes(message.author.id)) {
      return message.reply('You are not an admin for this event.');
    }

    let note = args.slice(1).join(' ');

    await db.events.putNote(note, event.id);
    message.react('✅');
  } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Associate a note with an event - this can be something like a link to a YouTube guide playlist, or other pertinent information (This is a sherpa run, prestige run, speedrun etc.).  Notes can be up to 128 characters in length.'
};