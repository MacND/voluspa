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

    // Users table

    getUsers: async () => {
        try {
            let [rows, fields] = await pool.query('SELECT * FROM users;');
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    postUser: async (discordId, bnetId, timezone) => {
        try {
            let [rows, fields] = await pool.query('INSERT INTO users (discordId, bnetId, timezone) VALUES (:discordId, :bnetId, :timezone);',
                {
                    discordId: discordId,
                    bnetId: bnetId,
                    timezone: timezone
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putUserTimezone: async (timezone, discordId) => {
        try {
            let [rows, fields] = await pool.query('UPDATE users SET timezone = :tz WHERE discordId = :discordId;',
                {
                    discordId: discordId,
                    tz: timezone
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putUserBnet: async (bnet, discordId) => {
        try {
            let [rows, fields] = await pool.query('UPDATE users SET bnetId = :bnet WHERE discordId = :discordId;',
                {
                    discordId: discordId,
                    bnet: bnet
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putUserGsheet: async (discordId, gsheetId) => {
        try {
            let [rows, fields] = await pool.query('UPDATE users SET gsheeturl = :gsheetId WHERE discordId = :discordId;',
                {
                    discordId: discordId,
                    gsheetId: gsheetId
                });
        } catch (err) {
            throw new Error(err);
        }
    },

    // Events table

    getEvent: async (joinCode) => {
        try {
            let [rows, fields] = await pool.query('SELECT * FROM events e INNER JOIN activities a ON a.shortCode = e.eventShortCode WHERE joinCode = :joinCode;',
                {
                    joinCode: joinCode
                });
            return rows[0];
        } catch (err) {
            throw new Error(err);
        }
    },

    getFireteam: async (fireteamId) => {
        try {
            let [rows, fields] = await pool.query('SELECT guardianId FROM fireteamMembers WHERE fireteamId = :fireteamId;',
                {
                    fireteamId: fireteamId
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    getEvents: async () => {
        try {
            let [rows, fields] = await pool.query('SELECT * FROM vSchedule;');
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    getHistory: async () => {
        try {
            let [rows, fields] = await pool.query('SELECT * FROM vHistory;');
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    postEvent: async (shortCode, adminId, openedTime) => {
        try {
            let [rows, fields] = await pool.query(`
                START TRANSACTION; 
                INSERT INTO events (eventShortCode, adminId, openedTime) VALUES (:shortCode, :adminId, :openedTime);
                SELECT @eventId:=LAST_INSERT_ID();
                SELECT @activityCount:=(SELECT COUNT(eventShortCode) FROM events WHERE eventShortCode = :shortCode);
                INSERT INTO fireteamMembers(guardianId, fireteamId) VALUES(:adminId, @eventId);
                UPDATE events SET joinCode = CONCAT(eventShortCode, '-', @activityCount), fireteamId = @eventId WHERE id = @eventId;
                COMMIT;`,
                {
                    shortCode: shortCode,
                    adminId: adminId,
                    openedTime: openedTime
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putEventStartTime: async (startTime, joinCode, adminId) => {
        try {
            let [rows, fields] = await pool.query('UPDATE events SET startTime = :startTime WHERE joinCode = :joinCode AND adminId = :adminId;',
                {
                    startTime: startTime,
                    joinCode: joinCode,
                    adminId: adminId
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putEventFinishTime: async (joinCode, finishTime) => {
        try {
            var [rows, fields] = await pool.query(`UPDATE events SET finishTime = :finishTime WHERE joinCode = :joinCode`,
                {
                    finishTime: finishTime,
                    joinCode: joinCode
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putEventRaidReport: async (joinCode, rrLink) => {
        try {
            var [rows, fields] = await pool.query(`UPDATE events SET raidReportUrl = :rr WHERE joinCode = :joinCode`,
                {
                    rr: rrLink,
                    joinCode: joinCode
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putEventAdmin: async (joinCode, adminId) => {
        try {
            var [rows, fields] = await pool.query('UPDATE events SET adminId = :adminId WHERE joinCode = :joinCode;',
                {
                    joinCode: joinCode,
                    adminId: adminId
                });
        } catch (err) {
            throw new Error(err);
        }
    },

    deleteEvent: async (joinCode) => {
        try {
            var [rows, fields] = await pool.query(`DELETE FROM events WHERE joinCode = :joinCode;`,
                {
                    joinCode: joinCode,
                });
        } catch (err) {
            throw new Error(err);
        }
    },

    // Activities table 

    getActivities: async () => {
        try {
            let [rows, fields] = await pool.query('SELECT * FROM activities;');
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    // Fireteam table

    getFireteams: async () => {
        try {
            let [rows, fields] = await pool.query('SELECT fireteamId, GROUP_CONCAT(guardianId) AS guardians FROM fireteamMembers GROUP BY fireteamId;');
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    putFireteam: async (discordId, fireteamId) => {
        try {
            let [rows, fields] = await pool.query('INSERT INTO fireteamMembers (guardianId, fireteamId) VALUES (:guardianId, :fireteamId);',
                {
                    guardianId: discordId,
                    fireteamId: fireteamId
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    deleteFireteam: async (fireteamId) => {
        try {
            var [rows, fields] = await pool.query('DELETE FROM fireteamMembers WHERE  fireteamId = :fireteamId;',
                {
                    fireteamId: fireteamId
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

    deleteFireteamMember: async (discordId, fireteamId) => {
        try {
            var [rows, fields] = await pool.query('DELETE FROM fireteamMembers WHERE guardianId = :guardianId AND fireteamId = :fireteamId;',
                {
                    guardianId: discordId,
                    fireteamId: fireteamId
                });
            return rows;
        } catch (err) {
            throw new Error(err);
        }
    },

};
