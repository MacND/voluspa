exports.run = async (client, message, args) => {
  try {
    message.channel.send('Voluspa, a Discord bot for managing Destiny 2 activities - <https://github.com/macnd/voluspa>');
  } catch (err) {
    throw new Error(err);
  }
};