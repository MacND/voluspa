module.exports = pool => ({
  get: async () => {
    try {
      let rows = await pool.query('SELECT * FROM events e INNER JOIN activities a ON a.id = e.activity_id');
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  getById: async (id) => {
    try {
      let rows = await pool.query('SELECT * FROM events e INNER JOIN activities a ON a.id = e.activity_id WHERE e.id = :id',
        {
          id
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },
  
  getByJoinCode: async (joinCode) => {
    try {
      let rows = await pool.query('SELECT * FROM events e INNER JOIN activities a ON a.id = e.activity_id WHERE join_code = :joinCode;',
        {
          joinCode
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  post: async (creatorId, activityId, activityNickname, openedTime) => {
    try {
      let rows = await pool.query(
        `
        START TRANSACTION; 
        INSERT INTO events (activity_id, opened_time) VALUES (:activityId, :openedTime);
        SELECT @eventId:=LAST_INSERT_ID();
        SELECT @activityCount:=(SELECT COUNT(activity_id) FROM events WHERE activity_id = :activity_id);
        INSERT INTO fireteams(user_id, event_id, admin) VALUES(:creatorId, @eventId, true);
        UPDATE events SET join_code = CONCAT(activityNickname, '-', @activityCount);
        COMMIT;`,
        {
          creatorId,
          activityId,
          openedTime,
          activityNickname
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putStartTime: async (startTime, joinCode) => {
    try {
      let rows = await pool.query('UPDATE events SET start_time = :startTime WHERE join_code = :joinCode;',
        {
          startTime,
          joinCode
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putFinishTime: async (finishTime, joinCode) => {
    try {
      let rows = await pool.query('UPDATE events SET finish_time = :finishTime WHERE join_code = :joinCode',
        {
          finishTime,
          joinCode
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },
  
  putRaidReport: async (rrLink, joinCode) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE events SET raidReportUrl = :rrLink WHERE join_code = :joinCode',
        {
          rrLink,
          joinCode
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  delete: async (joinCode) => {
    try {
      let rows = await pool.query('DELETE FROM events WHERE join_code = :joinCode;',
        {
          joinCode
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  }
});