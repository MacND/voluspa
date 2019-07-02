let moment = require(__basedir + '/utils/moment.js');

module.exports = {
  run: async (client, message, args) => {
    try {
      if (!args[0]) {
        message.reply('Please supply an activity nickname.');
        return;
      }

      let activity = await client.db.activities.getByNickname(args[0]);

      if (!activity) {
        message.reply(`Unable to find an activity with nickname ${args[0]}.`);
      }

      let res = await client.db.events.post(message.author.id, activity.id, moment.utc().format('YYYY-MM-DD HH:mm:ss'));
      message.reply(`Created event with join code \`${res[5][0].join_code}\`.`);

    } catch (err) {
      throw new Error(err);
    }
  },

  help: 'Make a new event.  You must provide an activity nickname (`!activityinfo`).  You can also use the `-private` flag to create a private event.'
};