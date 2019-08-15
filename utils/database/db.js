const pool = require(__basedir + '/utils/database/pool.js');

let users = require(__basedir + '/utils/database/users.js')(pool);
let events = require(__basedir + '/utils/database/events.js')(pool);
let activities = require(__basedir + '/utils/database/activities.js')(pool);
let fireteams = require(__basedir + '/utils/database/fireteams.js')(pool);
let zDBversion = require(__basedir + '/utils/database/zDBversion.js')(pool);

module.exports = {
  users,
  events,
  activities,
  fireteams,
  zDBversion
};