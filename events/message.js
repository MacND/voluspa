module.exports = (client, message) => {
  if (message.author.bot) return;
  if (message.content.indexOf(client.config.prefix) !== 0) return;

  const args = message.content.slice(client.config.prefix.length).trim().match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g);
  args.forEach((arg, index) => {
    args[index] = arg.replace(/"/g, '');
  });
  const command = args.shift().toLowerCase();

  const cmd = client.commands.get(command);

  if (!cmd) return;

  cmd.run(client, message, args);
};