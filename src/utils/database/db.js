const pool = require(__basedir + '/src/utils/database/pool.js');

let users = require(__basedir + '/src/utils/database/users.js')(pool);
let events = require(__basedir + '/src/utils/database/events.js')(pool);
let activities = require(__basedir + '/src/utils/database/activities.js')(pool);
let fireteams = require(__basedir + '/src/utils/database/fireteams.js')(pool);
let nookazon = require(__basedir + '/src/utils/database/nookazon.js')(pool);

module.exports = {
  users,
  events,
  activities,
  fireteams,
  nookazon
};