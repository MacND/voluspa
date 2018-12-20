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
    getUsers: async () => {
        try {
            let [rows, fields] = await pool.query('SELECT * FROM users;');
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    getActivities: async () => {
        try {
            let [rows, fields] = await pool.query('SELECT * FROM activities;');
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    getEvents: async () => {
        try {
            let [rows, fields] = await pool.query('SELECT * FROM vSchedule WHERE finishTime IS NULL;');
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    getFireteams: async () => {
        try {
            let [rows, fields] = await pool.query('SELECT fireteamId, GROUP_CONCAT(guardianId) AS guardians FROM fireteamMembers GROUP BY fireteamId;');
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putUser: async (discordId, bnetId, timezone) => {
        try {
            let [rows, fields] = await pool.query('INSERT INTO users (discordId, bnetId, timezone) VALUES (:discordId, :bnetId, :timezone);', 
                {   discordId: discordId, 
                    bnetId: bnetId, 
                    timezone: timezone 
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putFireteam: async (discordId, fireteamId) => {
        try {
            let [rows, fields] = await pool.query('INSERT INTO fireteamMembers (guardianId, fireteamId) VALUES (:guardianId, :fireteamId);',
                {   guardianId: discordId, 
                    fireteamId: fireteamId 
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putEvent: async (shortCode, adminId, openedTime) => {
        try {
            let [rows, fields] = await pool.query(`
                START TRANSACTION; 
                INSERT INTO events (eventShortCode, adminId, openedTime) VALUES (:shortCode, :adminId, :openedTime);
                SELECT @eventId:=LAST_INSERT_ID();
                SELECT @activityCount:=(SELECT COUNT(eventShortCode) FROM events WHERE eventShortCode = :shortCode);
                INSERT INTO fireteamMembers(guardianId, fireteamId) VALUES(:adminId, @eventId);
                UPDATE events SET joinCode = CONCAT(eventShortCode, '-', @activityCount), fireteamId = @eventId WHERE id = @eventId;
                COMMIT;`,
                {   shortCode: shortCode, 
                    adminId: adminId,
                    openedTime: openedTime 
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    }
};
