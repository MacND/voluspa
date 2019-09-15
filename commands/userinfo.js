const db = require(__basedir + '/utils/database/db.js');

exports.run = async (client, message, args) => {
  try {
    let searchUserId;
    if (args[0]) {
      try {
        searchUserId = client.users.find(user => user.username.toLowerCase() === args[0].toLowerCase()).id;
      } catch (err) {
        message.reply(`Unable to find a user with the username ${args[0]}`);
        throw new Error(err);
      }
    } else {
      searchUserId = message.author.id;
    }

    let user = await db.users.getByDiscordId(searchUserId);

    if (!user) {
      message.channel.send(`${client.users.get(searchUserId).username} is not registered.`);
      return;
    }
    message.channel.send(`User information for ${client.users.get(searchUserId).username}:\`\`\`BNet ID: ${user.bnet_id}\nTimezone: ${user.timezone}\nTwitch: ${(user.twitch ? user.twitch : 'Not set')}\nNotifications: ${(user.newEventNotification ? 'On' : 'Off')}\`\`\``);
  } catch (err) {
    throw new Error(err);
  }
};