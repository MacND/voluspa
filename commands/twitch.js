const db = require(__basedir + '/utils/database/db.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (!args[0]) {
        message.reply('please provide your Twitch username.');
        return;
      }

      if (args[0].includes(':', '/', '.')) {
        message.reply('invalid Twitch username supplied - did you provide a link instead?');
        return;
      }

      let twitch = args[0];
      let user = db.users.getByDiscordId(message.author.id);

      if (!user) {
        message.channel.send('Unable to find user - have you registered?');
        return;
      }

      if (twitch === user.twitch) {
        message.reply(`your Twitch username is already set to ${user.twitch}.`);
        return;
      }

      await db.users.putTwitch(message.author.id, twitch);
      message.react('✅');
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Add your Twitch username to the database.  This should only be your username, and *not* the link to your channel.  If you mark yourself as streaming a raid, the bot will link to your channel.'
};