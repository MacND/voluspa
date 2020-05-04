const db = require(__basedir + '/src/utils/database/db.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (args[0] === 'set') {
        if (args[1]) {
          await db.nookazon.addProfile(message.author.id, args[1]);
          message.react('✅');
          return;
        } else {
          return message.reply('Error: no profile URL provided.');
        }
      }
      
      let searchUserId;

      if (args[0]) {
        try {
          searchUserId = client.users.cache.find(user => user.username.toLowerCase() === args[0].toLowerCase()).id;
        } catch (err) {
          message.reply(`Unable to find a user with the username ${args[0]}`);
          throw new Error(err);
        }
      } else {
        searchUserId = message.author.id;
      }
  
      let user = await db.nookazon.getByDiscordId(searchUserId);
  
      if (!user) {
        message.channel.send(`No Nookazon information found for ${client.users.cache.get(searchUserId).username}.  See how to add your information by doing \`!nookazon help\``);
        return;
      }
      message.channel.send(`Nookazon information for ${client.users.cache.get(searchUserId).username}:\nWishlist: <${user.nookazon_profile_url}/wishlist>\nCatalog: <${user.nookazon_profile_url}/catalog>`);
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Add your Nookazon profile, and view other users Nookazon info.  When adding your info, be sure to use your profile link (which ends in a number), and not the links ending /catalog or /wishlist.  Usage:```Add info - !nookazon set https://nookazon.com/profile/1234567890\n\nView info - !nookazon username```',
  aliases: ['nook']
};
