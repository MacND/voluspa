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

  post: async (discordId, timezone) => {
    try {
      let [rows, fields] = await pool.query('INSERT INTO users (discord_id, timezone) VALUES (:discordId, :timezone);',
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
  },

  putOAuth: async (discordId, accessToken, refreshToken) => {
    try {
      let [rows, fields] = await pool.query(
        'INSERT INTO users (discord_id, discord_access_token, discord_refresh_token) VALUES(:discordId, :accessToken, :refreshToken) ON DUPLICATE KEY UPDATE discord_access_token = :accessToken, discord_refresh_token = :refreshToken',
        {
          discordId,
          accessToken,
          refreshToken
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  }
});