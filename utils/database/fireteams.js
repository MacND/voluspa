module.exports = pool => ({
  get: async () => {
    try {
      let [rows, fields] = await pool.query('SELECT event_id, GROUP_CONCAT(discord_id) AS discord_id FROM fireteams GROUP BY event_id;');
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  getByEventId: async (eventId) => {
    try {
      let [rows, fields] = await pool.query('SELECT GROUP_CONCAT(discord_id) AS discord_id FROM fireteams WHERE event_id = :eventId GROUP BY event_id;',
        {
          eventId
        }
      );
      return rows[0];
    } catch (err) {
      throw new Error(err);
    }
  },

  getAdminsByEventId: async (eventId) => {
    try {
      let [rows, fields] = await pool.query('SELECT GROUP_CONCAT(discord_id) AS discord_id FROM fireteams WHERE event_id = :eventId AND admin = true GROUP BY event_id;',
        {
          eventId
        }
      );
      return rows[0];
    } catch (err) {
      throw new Error(err);
    }
  },

  getNextAdmin: async (eventId, currentAdminId) => {
    try {
      let [rows, fields] = await pool.query('SELECT discord_id FROM fireteams WHERE event_id = :eventId AND `admin` = TRUE AND discord_id NOT LIKE :currentAdminId ORDER BY join_date ASC LIMIT 1;',
        {
          eventId,
          currentAdminId
        }
      );
      return rows[0];
    } catch (err) {
      throw new Error(err);
    }
  },

  put: async (userId, eventId, reserve=0) => {
    try {
      let [rows, fields] = await pool.query('INSERT INTO fireteams (discord_id, event_id, reserve) VALUES (:userId, :eventId, :reserve);',
        {
          userId,
          eventId,
          reserve
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putAdmin: async (userId, eventId) => {
    try {
      let [rows, fields] = await pool.query('UPDATE fireteams SET admin = true WHERE discord_id = :userId AND event_id = :eventId;',
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
      let [rows, fields] = await pool.query('DELETE FROM fireteams WHERE discord_id = :userId AND event_id = :eventId;',
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