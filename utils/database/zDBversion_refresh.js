module.exports = pool => ({

  create: async () => {
    try {
      let tablename = 'zDBversion'
      let version = 1
      let create = `START TRANSACTION
                      CREATE TABLE 'zDBversion' (
                        'tablename' varchar(64) NOT NULL,
                        'version' smallint NOT NULL,
                        PRIMARY KEY ('name')
                      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                      
                      INSERT INTO 'zDBversion'
                        (name, version)
                      VALUES
                        ('${tablename}', ${version})
                    COMMIT`

      let [rows, fields] = await pool.query(create);
      return true;
    } catch (err) {
      throw new Error(err);
    }
  }

//  update: async () => {
//    try {
//      let tablename = 'zDBversion'
//      let version = 2
//      let update = `START TRANSACTION
//                      ALTER TABLE 'zDBversion'
//                        yada yada placeholder
//                      
//                      UPDATE 'zDBversion'
//                      SET version = ${version}
//                      WHERE tablename = ${tablename}
//                    COMMIT`
//
//      let [rows, fields] = await pool.query('SELECT name, version FROM zDBversion;');
//      return rows;
//    } catch (err) {
//      throw new Error(err);
//    }
//  }

});