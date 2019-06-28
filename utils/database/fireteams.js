module.exports = pool => ({
  get: async () => {
    try {
      let [rows, fields] = await pool.query('SELECT event_id, GROUP_CONCAT(user_id) AS guardians FROM fireteams GROUP BY event_id;');
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  put: async (userId, eventId) => {
    try {
      let [rows, fields] = await pool.query('INSERT INTO fireteams (user_id, event_id) VALUES (:userId, :eventId);',
        {
          userId,
          eventId
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  delete: async (eventId) => {
    try {
      let [rows, fields] = await pool.query('DELETE FROM fireteams WHERE event_id = :eventId;',
        {
          eventId
        }
      );

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  deleteMember: async (userId, eventId) => {
    try {
      let [rows, fields] = await pool.query('DELETE FROM fireteams WHERE user_id = :userId AND event_id = :eventId;',
        {
          userId,
          eventId
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  }
});