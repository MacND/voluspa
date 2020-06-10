const moment = require(__basedir + '/src/utils/moment.js');
const db = require(__basedir + '/src/utils/database/db.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      let user = await db.users.getByDiscordId(message.author.id);

      if (user) {
        return message.reply(`You appear to already be registered - do \`${client.config.prefix}userinfo\` to view your current details, or go to <https://voluspa.app/profile>`);
      } else {
        return message.reply('You can register by visiting <https://voluspa.app/login>');
      } 

    } catch (err) {
      message.react('❌');
      throw new Error(err);
    }
  },

  help: 'Register to use the bot.  You must provide your BNet ID including discriminator (e.g. `Voluspa#12345`), and your timezone in TZ database string format (e.g. `Europe/London`).'
};