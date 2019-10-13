const fs = require('fs');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (!message.member.voiceChannel) {
        return;
      }

      let files = fs.readdirSync(__basedir + '/utils/shaxx');
      let file = files[Math.floor(Math.random() * files.length)];
      let connection = await message.member.voiceChannel.join();
      console.log(__basedir + '/utils/shaxx/' + file);
      let dispatcher = connection.playFile(__basedir + '/utils/shaxx/' + file);

      dispatcher.on('end', () => message.member.voiceChannel.leave());

    } catch (err) {
      message.member.voiceChannel.leave();
      throw new Error(err);
    }
  },

  help: 'Delightful!'
};