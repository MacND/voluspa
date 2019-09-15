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
  },
  cancel: key => {
    clearTimeout(Timer.map.get(key));
  }
};

module.exports = client => ({
  pingUsers: async (users, message) => {
    for (let i=0; i<users.length; i++) {
      client.fetchUser(users[i]).send(message);
    }
  },

  pingUsersBeforeEvent: async (users, message, date, eventName) => {
    Timer.set(eventName, () => {
      for (let i=0; i<users.length; i++) {
        client.fetchUser(users[i]).send(message);
      }
    }, date.clone().subtract(15, 'minutes').toDate());
  }
});