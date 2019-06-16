module.exports = {
  run: async (client, message, args) => {
    try {
      if (!args[0]) {
        message.reply(`Available commands: ${Array.from(client.commands.keys()).join(', ')}`);
        return;
      }

      let command = client.commands.get(args[0]);

      if (!command) {
        message.reply('Sorry, I couldn\'t find a command with that name.');
        return;
      }

      message.reply(`${args[0]} => ` + command.help);

    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Get help on commands.  `!help` with no arguments lists all available commands, `!help` with a valid command name shows extended help and information on the specified command.'
};