const mysql = require('mysql2');
const config = require(__basedir + '/config/database.json');
const pool = mysql.createPool({
  host: config.dbhost,
  user: config.dbuser,
  password: config.dbpass,
  database: config.dbname,
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
  namedPlaceholders: true,
  timezone: 'Z'
}).promise();

console.log('Database pool created and connected');

module.exports = pool;