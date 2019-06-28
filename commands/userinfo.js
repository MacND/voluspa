exports.run = async (client, message, args) => {
  try {
    let searchUserId = args[0] ? client.users.find(user => user.username.toLowerCase() === args[0].toLowerCase()).id : message.author.id;
    let user = await client.db.users.getByDiscordId(searchUserId);

    if (!user) {
      message.channel.send(`${client.users.get(searchUserId).username} is not registered.`);
      return;
    }
    message.channel.send(`User information for ${client.users.get(searchUserId).username}:\`\`\`BNet ID: ${user.bnet_id}\nTimezone: ${user.timezone}\nTwitch: ${(user.twitch ? user.twitch : 'Not set')}\nNotifications: ${(user.newEventNotification ? 'On' : 'Off')}\`\`\``);
  } catch (err) {
    throw new Error(err);
  }
};