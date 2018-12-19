const config = require("./config.json");
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: config.dbhost,
    user: config.dbuser,
    password: config.dbpass,
    database: config.dbname,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
    namedPlaceholders: true
}).promise();

module.exports = {
    getUsers: async function () {
        try {
            var [rows, fields] = await pool.query('SELECT * FROM users;');
            return rows;
        } catch (err) {
            throw new Error(err)
        }
    },

    getActivities: async function () {
        try {
            var [rows, fields] = await pool.query('SELECT * FROM activities;');
            return rows;
        } catch (err) {
            throw new Error(err)
        }
    },

    getEvents: async function () {
        try {
            var [rows, fields] = await pool.query('SELECT * FROM scheduleView WHERE finishTime IS NULL;');
            return rows;
        } catch (err) {
            throw new Error(err)
        }
    },

    getFireteams: async function () {
        try {
            var [rows, fields] = await pool.query('SELECT fireteamId, GROUP_CONCAT(guardianId) AS guardians FROM fireteamMembers GROUP BY fireteamId;');
            return rows;
        } catch (err) {
            throw new Error(err)
        }
    }
};
