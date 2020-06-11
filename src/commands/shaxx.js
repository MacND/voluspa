const fs = require('fs');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (!message.member.voice.channel) {
        return;
      }

      const files = fs.readdirSync(__basedir + '/src/utils/shaxx');
      const file = files[Math.floor(Math.random() * files.length)];
      const connection = await message.member.voice.channel.join();
      console.log(__basedir + '/src/utils/shaxx/' + file);
      const dispatcher = connection.play(__basedir + '/src/utils/shaxx/' + file);

      dispatcher.on('finish', () => {
        message.member.voice.channel.leave();
      });

      message.react('✅');
    } catch (err) {
      message.member.voice.channel.leave();
      throw new Error(err);
    }
  },

  help: 'Delightful!'
};