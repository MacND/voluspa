module.exports = pool => ({

  getRequiredTableVersion: async () => {
    try {
      let version = 1;
      return version;
    } catch (err) {
      throw new Error(err);
    }
  },
  
  get: async () => {
    try {
      let [rows, fields] = await pool.query('SELECT name, version FROM zDBversion;');
      return rows;
    } catch (err) {
      throw new Error(err);
    }
  },

  getCurrentVersionByName: async (name) => {
    try {
      let [rows, fields] = await pool.query('SELECT version FROM zDBversion WHERE name = :name;',
        {
          name
        }
      );
      if (rows.length > 0) {
        return rows[0].version;
      } else {
        throw new Error('No version recorded for that table name. You can use existsCurrentVersionByName to check first if version info exists.');
      }
      
    } catch (err) {
      throw new Error(err);
    }
  },

  existsCurrentVersionByName: async (name) => {
    try {
      let [rows, fields] = await pool.query('SELECT version FROM zDBversion WHERE name = :name;',
        {
          name
        }
      );
      if (rows.length > 0) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      throw new Error(err);
    }
  }
});