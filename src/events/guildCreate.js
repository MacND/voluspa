module.exports = async (client, guild) => {
  console.log(`Joined new guild: ${guild}`);
  const channel = guild.channels.cache.find(channel => channel.type === 'text' && channel.permissionsFor(guild.me).has('SEND_MESSAGES'));
  return channel.send('Greetings Guardians, my name is Voluspa.  If you\'ve never used me before, you can register by visiting https://voluspa.app and logging in.  You can view my commands by typing `!help`.');
};