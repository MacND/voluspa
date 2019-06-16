module.exports = pool => {
  async (discordId, bnetId, timezone) => {
    try {
      let [
        rows,
        fields
      ] = await pool.query('INSERT INTO users (discordId, bnetId, timezone) VALUES (:discordId, :bnetId, :timezone);',
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
  }
};