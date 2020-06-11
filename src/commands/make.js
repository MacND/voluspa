const moment = require(__basedir + '/src/utils/moment.js');
const db = require(__basedir + '/src/utils/database/db.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (!args[0]) {
        message.reply('Please supply an activity nickname.');
        return;
      }

      let activity = await db.activities.getByNickname(args[0]);

      if (!activity) {
        message.reply(`Unable to find an activity with nickname ${args[0]}.`);
      }

      let private;
      
      args.includes('-private') ? private = 1 : private = 0;

      let res = await db.events.post(message.author.id, activity.id, moment.utc().format('YYYY-MM-DD HH:mm:ss'), private, message.guild.id);
      message.reply(`Created event with join code \`${res[5][0].join_code}\`.`);

    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Make a new event.  You must provide an activity nickname (`!activityinfo`).  You can also use the `-private` flag to create a private event.'
};