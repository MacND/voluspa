exports.run = async (client, message, args) => {
  let [
    rows,
    fields
  ] = await client.dbpool.query('SELECT * FROM users;');
  let users = rows;

  try {
    if (!args[0]) {
      message.reply('please provide your Twitch username.');

      return;
    }

    let twitch = args[0];
    let user = users.find(o => o.discordId == message.author.id);

    if (!user) {
      message.channel.send('Unable to find user - have you registered?');

      return;
    }

    if (twitch.includes(':', '/', '.')) {
      message.reply('invalid Twitch username supplied - did you provide a link instead?');

      return;
    }

    if (twitch === user.twitch) {
      message.reply(`your Twitch username is already set to ${user.twitch}.`);

      return;
    }

    let [
      rows,
      fields
    ] = await client.dbpool.query(
      'UPDATE users SET twitch = :twitch WHERE discordId = :discordId',
      {
        discordId: user.discordId,
        twitch
      }
    );
  } catch (err) {
    throw new Error(err);
  }
};