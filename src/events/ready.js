const db = require(__basedir + '/src/utils/database/db.js');
const moment = require(__basedir + '/src/utils/moment.js');

module.exports = async client => {
  console.log('Successfully connected to Discord, setting up event timers...');
  const notify = require(__basedir + '/src/utils/notify.js')(client);

  try {
    const guilds = client.guilds.cache.map(guild => guild.id);

    guilds.forEach(async (guild) => {
      const events = await db.events.getNext('%', guild);
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.start_time < moment.utc()) {
          return;
        }
  
        const fireteam = await db.fireteams.getByEventId(event.id);
        notify.pingUsersBeforeEvent(fireteam.discord_id.split(','), `In 10 minutes you are scheduled to take part in **${event.join_code}**.  Please proceed to orbit and join up with your fireteam.`, moment(event.start_time).utc(), event.join_code);
        console.log(`Created timer for ${event.join_code}`);
      }
    });
  } catch (err) {
    throw new Error(err);
  }

  console.log('Voluspa is online.');
};