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

  getNext: async (filter='%') => {
    try {
      let [rows, fields] = await pool.query('SELECT * FROM vw_next_3_events WHERE fireteam LIKE :filter;',
        {
          filter
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  post: async (creatorId, activityId, openedTime, private) => {
    try {
      let [rows, fields] = await pool.query(`
        CALL make_event(:activityId, :openedTime, :creatorId, :private, @join_code); SELECT @join_code AS join_code;`,
      {
        creatorId,
        activityId,
        openedTime,
        private
      }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putStartTime: async (startTime, eventId) => {
    try {
      let [rows, fields] = await pool.query('UPDATE events SET start_time = :startTime WHERE id = :eventId;',
        {
          startTime,
          eventId
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putFinishTime: async (finishTime, eventId) => {
    try {
      let [rows, fields] = await pool.query('UPDATE events SET finish_time = :finishTime WHERE id = :eventId',
        {
          finishTime,
          eventId
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },
  
  putRaidReport: async (rrLink, eventId) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE events SET raid_report_url = :rrLink WHERE id = :eventId',
        {
          rrLink,
          eventId
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putNote: async (note, eventId) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query(
        'UPDATE events SET note = :note WHERE id = :eventId',
        {
          note,
          eventId
        }
      );
    } catch (err) {
      throw new Error(err);
    }
  },

  delete: async (eventId) => {
    try {
      let [rows, fields] = await pool.query('DELETE FROM events WHERE id = :eventId;',
        {
          eventId
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  }
});