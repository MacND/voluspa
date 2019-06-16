let moment = require(__basedir + '/utils/moment.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      async function getUsers() {
        try {
          let [
            rows,
            fields
          ] = await client.dbpool.query('SELECT * FROM users;');
          return rows;
        } catch (err) {
          throw new Error(err);
        }
      }

      async function putUser(discordId, bnetId, timezone) {
        try{
        let [
          rows,
          fields
        ] = await client.dbpool.query('INSERT INTO users (discordId, bnetId, timezone) VALUES (:discordId, :bnetId, :timezone);',
          {
            discordId,
            bnetId,
            timezone
          }
        );
        } catch (err) {
          throw new Error(err)
        }
      }

      let users = await getUsers();
      let user = users.find(o => o.discordId == message.author.id);

      if (user) {
        message.reply('You appear to already be registered - do `!userinfo` to view your current details.');
        return;
      }

      if (!args[0] || !args[0].includes('#')) {
        message.reply('Invalid Battle.Net ID supplied - please ensure you are using your full BNet ID, including the # dsicriminator.');
        return;
      }

      if (!args[1] || !moment.tz.zone(args[1])) {
        message.reply('Invalid timezone supplied - for a list of valid timezones, do `!timezone help`.');
        return;
      }

      let bnetId = args[0];
      let timezone = args[1];
      let discordId = message.author.id;

      await putUser(discordId, bnetId, timezone);
      message.react('✅');
    } catch (err) {
      message.react('❌');
      throw new Error(err);
    }
  },

  help: 'Register to use the bot.  You must provide your BNet ID including discriminator (e.g. `Voluspa#12345`), and your timezone in TZ database string format (e.g. `Europe/London`).'
};