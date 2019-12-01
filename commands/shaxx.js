const fs = require('fs');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (!message.member.voice.channel) {
        return;
      }

      let files = fs.readdirSync(__basedir + '/utils/shaxx');
      let file = files[Math.floor(Math.random() * files.length)];
      let connection = await message.member.voice.channel.join();
      console.log(__basedir + '/utils/shaxx/' + file);
      let dispatcher = connection.play(__basedir + '/utils/shaxx/' + file);

      dispatcher.on('start', () => {
        connection.player.streamingData.pausedTime = 0;
      });

      dispatcher.on('end', () => {
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