module.exports = pool => ({
  get: async () => {
    try {
      let [rows, fields] = await pool.query('SELECT * FROM events');
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  getById: async (id) => {
    try {
      let [rows, fields] = await pool.query('SELECT * FROM events WHERE id = :id',
        {
          id
        }
      );
      return rows[0];
    } catch (err) {
      throw new Error(err);
    }
  },
  
  getByJoinCode: async (joinCode) => {
    try {
      let [rows, fields] = await pool.query('SELECT * FROM events WHERE join_code = :joinCode;',
        {
          joinCode
        }
      );
      return rows[0];
    } catch (err) {
      throw new Error(err);
    }
  },

  post: async (creatorId, activityId, openedTime) => {
    try {
      let [rows, fields] = await pool.query(`
        CALL make_event(:activityId, :openedTime, :creatorId, @join_code); SELECT @join_code AS join_code;`,
      {
        creatorId,
        activityId,
        openedTime
      }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putStartTime: async (startTime, joinCode) => {
    try {
      let [rows, fields] = await pool.query('UPDATE events SET start_time = :startTime WHERE join_code = :joinCode;',
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
      let [rows, fields] = await pool.query('UPDATE events SET finish_time = :finishTime WHERE join_code = :joinCode',
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
      let [rows, fields] = await pool.query('DELETE FROM events WHERE join_code = :joinCode;',
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