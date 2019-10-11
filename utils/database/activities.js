module.exports = pool => ({
  get: async () => {
    try {
      let [rows, fields] = await pool.query('SELECT * FROM activities;');
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  getByNickname: async (nickname) => {
    try {
      let [rows, fields] = await pool.query('SELECT * FROM activities WHERE nickname = :nickname;',
        {
          nickname
        }
      );
      return rows[0];
    } catch (err) {
      throw new Error(err);
    }
  },

  getByID: async (id) => {
    try {
      let [rows, fields] = await pool.query('SELECT * FROM activities WHERE id = :id;',
        {
          id
        }
      );
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  }
});