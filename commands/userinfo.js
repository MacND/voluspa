exports.run = async (client, message, args) => {
  let [
    rows,
    fields
  ] = await client.dbpool.query('SELECT * FROM users;');
  let users = rows;

  try {
    let searchUserId = args[0] ? client.users.find(user => user.username.toLowerCase() === args[0].toLowerCase()).id : message.author.id;
    let user = users.find(o => o.discordId === searchUserId);

    if (!user) {
      message.channel.send(`${client.users.get(searchUserId).username} is not registered.`);
      message.channel.stopTyping();

      return;
    }

    message.channel.send(`User information for ${client.users.get(searchUserId).username}:\`\`\`BNet ID: ${user.bnetId}\nTimezone: ${user.timezone}\nTwitch: ${(user.twitch ? user.twitch : 'Not set')}\nNotifications: ${(user.newEventNotification ? 'On' : 'Off')}\`\`\``);
  } catch (err) {
    throw new Error(err);
  }
};