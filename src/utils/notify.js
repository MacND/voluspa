let Timer = {
  map: new Map(),
  set: (key, func, time) => {
    if (time instanceof Date) {
      time = time.getTime() - Date.now();
    }
    if (time < 0) {
      throw new Error('Can\'t set timer in the past');
    }
    Timer.cancel(key);
    Timer.map.set(key, setTimeout(func, time));
    console.log(`Setting new timer for ${key} in ${time}ms`);
  },
  cancel: key => {
    clearTimeout(Timer.map.get(key));
    console.log(`Cancelling timer for ${key}`);
  }
};

const moment = require(__basedir + '/src/utils/moment.js');

module.exports = client => ({
  pingUsers: async (users, message) => {
    for (let i=0; i<users.length; i++) {
      client.users.cache.get(users[i]).send(message);
    }
  },

  pingUsersBeforeEvent: async (users, message, date, join_code) => {
    Timer.set(join_code, () => {
      for (let i=0; i<users.length; i++) {
        client.users.cache.get(users[i]).send(message);
      }
    }, moment(date).clone().subtract(10, 'minutes').toDate());
  },

  cancelTimer: async (join_code) => {
    Timer.cancel(join_code);
  }
});