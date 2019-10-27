module.exports = pool => ({
  get: async () => {
    try {
      let [rows, fields] = await pool.query('SELECT * FROM users;');
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },
  
  getByDiscordId: async (discordId) => {
    try {
      let [rows, fields] = await pool.query('SELECT * FROM users WHERE discord_id = :discordId;',
        {
          discordId
        }
      );
      return rows[0];
    } catch (err) {
      throw new Error(err);
    }
  },

  post: async (discordId, bnetId, timezone) => {
    try {
      let [rows, fields] = await pool.query('INSERT INTO users (discord_id, bnet_id, timezone) VALUES (:discordId, :bnetId, :timezone);',
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

  putTimezone: async (discordId, timezone) => {
    try {
      let [rows, fields] = await pool.query(
        'UPDATE users SET timezone = :timezone WHERE discord_id = :discordId;',
        {
          discordId,
          timezone
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  putBnet: async (discordId, bnet) => {
    try {
      let [rows, fields] = await pool.query('UPDATE users SET bnet_id = :bnet WHERE discord_id = :discordId;',
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

  putTwitch: async (discordId, twitch) => {
    try {
      let [rows, fields] = await pool.query(
        'UPDATE users SET twitch = :twitch WHERE discord_id = :discordId',
        {
          discordId,
          twitch
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  }
});