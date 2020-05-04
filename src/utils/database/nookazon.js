module.exports = pool => ({
  getByDiscordId: async (discordId) => {
    try {
      let [rows, fields] = await pool.query('SELECT * FROM nookazon WHERE discord_id = :discordId;',
        {
          discordId
        }
      );
      return rows[0];
    } catch (err) {
      throw new Error(err);
    }
  },

  addProfile: async (discordId, nookazonUrl) => {
    try {
      let [rows, fields] = await pool.query('INSERT INTO nookazon (discord_id, nookazon_profile_url) VALUES (:discordId, :nookazonUrl) ON DUPLICATE KEY UPDATE nookazon_profile_url = :nookazonUrl;',
        {
          discordId,
          nookazonUrl
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  }
});