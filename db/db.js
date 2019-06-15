module.exports = pool => ({

  // Users table

  getUsers: async () => {
    try {
      let [
        rows,
        fields
      ] = await pool.query('SELECT * FROM users;');

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  postUser: async (discordId, bnetId, timezone) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'INSERT INTO users (discordId, bnetId, timezone) VALUES (:discordId, :bnetId, :timezone);',
        {
          discordId,
          bnetId,
          timezone
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putUserTimezone: async (timezone, discordId) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE users SET timezone = :tz WHERE discordId = :discordId;',
        {
          discordId,
          tz: timezone
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putUserBnet: async (bnet, discordId) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE users SET bnetId = :bnet WHERE discordId = :discordId;',
        {
          discordId,
          bnet
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putUserGsheet: async (discordId, gsheetId) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE users SET gsheeturl = :gsheetId WHERE discordId = :discordId;',
        {
          discordId,
          gsheetId
        }
      );
    } catch (err) {
      throw new Error(err);
    }
  },

  putUserTwitch: async (discordId, twitch) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE users SET twitch = :twitch WHERE discordId = :discordId',
        {
          discordId,
          twitch
        }
      );
    } catch (err) {
      throw new Error(err);
    }
  },

  putUserNotification: async (discordId, notify) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE users SET newEventNotification = :notify WHERE discordId = :discordId',
        {
          discordId,
          notify
        }
      );
    } catch (err) {
      throw new Error(err);
    }
  },

  // Events table

  getEvent: async raidId => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'SELECT * FROM events e INNER JOIN activities a ON a.shortName = e.shortName WHERE raidId = :raidId;',
        {
          raidId
        }
      );

      return rows[0];
    } catch (err) {
      throw new Error(err);
    }
  },

  getFireteam: async fireteamId => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'SELECT discordId FROM fireteams WHERE fireteamId = :fireteamId;',
        {
          fireteamId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  getEvents: async () => {
    try {
      let [
        rows,
        fields
      ] = await pool.query('SELECT * FROM vSchedule;');

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  getHistory: async () => {
    try {
      let [
        rows,
        fields
      ] = await pool.query('SELECT * FROM vHistory;');

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  postEvent: async (shortName, adminId, createdTime) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        `
                    START TRANSACTION; 
                    INSERT INTO events (shortName, adminId, createdTime) VALUES (:shortName, :adminId, :createdTime);
                    SELECT @eventId:=LAST_INSERT_ID();
                    SELECT @activityCount:=(SELECT COUNT(shortName) FROM events WHERE shortName = :shortName);
                    INSERT INTO fireteams(discordId, fireteamId) VALUES(:adminId, @eventId);
                    UPDATE events SET raidId = CONCAT(shortName, '-', @activityCount), fireteamId = @eventId WHERE id = @eventId;
                    COMMIT;`,
        {
          shortName,
          adminId,
          createdTime
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putEventStartTime: async (startTime, raidId, adminId) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE events SET startTime = :startTime WHERE raidId = :raidId AND adminId = :adminId;',
        {
          startTime,
          raidId,
          adminId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putEventFinishTime: async (raidId, finishTime) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE events SET finishTime = :finishTime WHERE raidId = :raidId',
        {
          finishTime,
          raidId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putEventRaidReport: async (raidId, rrLink) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE events SET raidReportUrl = :rr WHERE raidId = :raidId',
        {
          rr: rrLink,
          raidId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putEventAdmin: async (raidId, adminId) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE events SET adminId = :adminId WHERE raidId = :raidId;',
        {
          raidId,
          adminId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putSherpa: async (raidId, adminId) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE events SET sherpa = true WHERE raidId = :raidId AND adminId = :adminId;',
        {
          raidId,
          adminId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  deleteEvent: async raidId => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'DELETE FROM events WHERE raidId = :raidId;',
        {
          raidId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  deleteEventStartTime: async raidId => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE events SET startTime = NULL WHERE raidId = :raidId;',
        {
          raidId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  // Activities table

  getActivities: async () => {
    try {
      let [
        rows,
        fields
      ] = await pool.query('SELECT * FROM activities;');

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  // Fireteam table

  getFireteams: async () => {
    try {
      let [
        rows,
        fields
      ] = await pool.query('SELECT fireteamId, GROUP_CONCAT(discordId) AS guardians FROM fireteams GROUP BY fireteamId;');

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putFireteam: async (discordId, fireteamId) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'INSERT INTO fireteams (discordId, fireteamId) VALUES (:discordId, :fireteamId);',
        {
          discordId,
          fireteamId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  deleteFireteam: async fireteamId => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'DELETE FROM fireteams WHERE  fireteamId = :fireteamId;',
        {
          fireteamId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  deleteFireteamMember: async (discordId, fireteamId) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'DELETE FROM fireteams WHERE discordId = :discordId AND fireteamId = :fireteamId;',
        {
          discordId,
          fireteamId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  }

});