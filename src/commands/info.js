module.exports = {
  run: async (client, message, args) => {
    try {
      message.channel.send('Voluspa, a Discord bot for managing Destiny 2 activities - <https://voluspa.app>');
    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'This command shows more information about Voluspa, including the GitHub link.'
};