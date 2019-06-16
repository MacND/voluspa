module.exports = pool => ({
  run: async () => {
    try {
      let [
        rows,
        fields
      ] = await pool.query('SELECT * FROM users;');

      return rows;
    } catch (err) {
      throw new Error(err);
    }
  }
});