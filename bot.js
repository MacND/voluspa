// Require declarations
const Discord = require("discord.js");
const config = require("./config.json");
const { google } = require('googleapis');
const Maria = require("mariasql");
const key = require('./googleApiKey.json');
const moment = require('moment');
const momenttz = require('moment-timezone');

// Client declarations
const client = new Discord.Client({ disableEveryone: true });
const drive = google.drive('v3');
const sqlClient = new Maria({
    host: config.dbhost,
    user: config.dbuser,
    password: config.dbpass,
    db: config.dbname,
    multiStatements: true
});

const jwtClient = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ['https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive']
);

// Variable declarations
var events;
var registeredUsers;

// Functions
function updateUsers() {
    sqlClient.query('SELECT * FROM users;', (err, rows) => {
        if (err) throw (err);
        console.log('Pulled users from database.');
        registeredUsers = rows;
        console.log(rows);
    });
    sqlClient.end();
}

function updateEvents() {
    sqlClient.query('SELECT * FROM events;', (err, rows) => {
        if (err) throw (err);
        console.log('Pulled events from database.');
        events = rows;
        console.log(rows);
    });
    sqlClient.end();
}


client.on("ready", async () => {
    console.log(`Successfully connected to Discord`);
    client.user.setActivity(config.status);
});

jwtClient.authorize((err, tokens) => {
    if (err) {
        console.log(err);
        return;
    } else {
        console.log("Successfully connected to Google API");
    }
});

client.on("message", async message => {
    if (message.author.bot) return;
    if (message.content.indexOf(config.prefix) !== 0) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === "test") {
        message.channel.send('Eyes up, Guardian.');
    }

    if (command === "status") {
        if (args[0] == null) {
            message.channel.startTyping();
            message.channel.send(client.user.presence.game.name).then(() => { message.channel.stopTyping(); });
        } else {
            message.channel.startTyping();
            message.delete().catch(O_o => { });
            client.user.setActivity(args[0] === "reset" ? config.status : args.join(" ").replace(/["]+/g, ''));
            message.channel.send(args[0] === "reset" ? "Status reset" : "Status updated").then(() => { message.channel.stopTyping(); });
        }
    }

    if (command === "die" && message.author.id === '79711200312557568') {
        message.channel.send("Your light is lost...");
        client.destroy();
    }

    if (command === "eventinfo" && args[0]) {
        let event = events.find(o => o.shortCode == args[0]);
        if (event) {
            const embed = new Discord.RichEmbed()
                .setTitle(`${event.name} (${event.eventType})`)
                .setColor(5517157)
                .setDescription(`\"*${event.eventTagline}*\"\n${event.eventDescription}\n\`\`\`Short code: ${event.shortCode}\nRecommended power: ${event.minPower}\nAverage length: ${moment().startOf('day').seconds(event.avgLength).format('H:mm')}\n\`\`\``)
                .setURL(`${event.wikiLink}`)
                .setThumbnail(`https://gamezone.cool/img/${event.shortCode}.png`)
                .setFooter(`Gather your Fireteam - !suggest ${event.shortCode}`)

            message.channel.send(embed);
        }
    }

    if (command === "register" && args[0] && args[1] && message.channel.id === '494459395888119809') {
        let user = users.find(o => o.discordId == message.author.id);
        if (!user) {
            try {
                let response = await drive.files.list({
                    auth: jwtClient,
                    q: `name = '${args[0]}' AND '${config.driveFolderId}' in parents`
                });
                console.log(response.data);
            }
            catch (err) {
                console.log('The API returned an error: ' + err);
            }

            if ((args[0]).includes('#') && momenttz.tz.zone(args[1]) && !(response.data.files.length)) {
                let bnetId = args[0];
                let timezone = args[1];
                let discordId = (message.author.id);

                sqlClient.query('INSERT INTO users VALUES (:discordId, :bnetId, :timezone);', { discordId: discordId, bnetId: args[0], timezone: args[1] }, function (err, rows) {
                    if (err)
                        throw (err);
                    console.log(rows);
                    message.channel.send(`${message.author} registered BNet tag ${bnetId} with timezone ${timezone}`);
                });
                sqlClient.end();
            } else {
                message.channel.send(`${message.author} malformed input - please ensure you are using your full BNet ID (including #) and a valid timezone.`);
            }
        } else {
            message.channel.send(`${message.author} Error: you may already be registered, or you did not specify both your BNet ID and Timezone`);
        }
    }

    if (command === "timezone") {
        if (args[0] === 'help') {
            message.author.send('You can find the list of acceptable timezones here: <https://github.com/MacND/the-oracle-engine/blob/master/timezones.json>');
            message.react('✅');
        } else if (moment.tz.zone(args[0])) {
            sqlClient.query('UPDATE users SET timezoneLocale = :tz WHERE discordId = :discordId;', { discordId: message.author.id, tz: args[0] }, function (err, rows) {
                if (err)
                    throw (err);
                console.log(rows);
                if (rows.info.affectedRows === '0') {
                    message.channel.send(`${message.author} unable to update timezone - are you registered?`);
                } else {
                    message.channel.send(`${message.author} updated timezone to ${args[0]}`);
                }
            });
            sqlClient.end();
        } else {
            message.react("❌");
        }
    }

    if (command === "bnet") {
        if (args[0] && args[0].includes('#')) {
            sqlClient.query('UPDATE users SET bnetId = :bnet WHERE discordId = :discordId;', { discordId: message.author.id, bnet: args[0] }, function (err, rows) {
                if (err)
                    throw (err);
                console.log(rows);
                if (rows.info.affectedRows === '0') {
                    message.channel.send(`${message.author} unable to update BNet ID - are you registered?`);
                } else {
                    message.channel.send(`${message.author} updated BNet ID to ${args[0]}`);
                }
            });
            sqlClient.end();
        }
    }

    if (command === "userinfo") {
        let discordId = (args[0] ? client.users.find(user => user.username.toLowerCase() === args[0].toLowerCase()).id : message.author.id);
        sqlClient.query('SELECT * FROM users WHERE discordId = :discordId;', { discordId: discordId }, function (err, rows) {
            if (err) throw (err);
            console.log(rows);
            message.channel.send(`User information for ${client.users.get(discordId).tag}\`\`\`BNet ID: ${rows[0].bnetId}\nTimezone: ${rows[0].timezoneLocale}\`\`\``);
        });
        sqlClient.end();
    }

    if (command === "suggest", args[0]) {
        sqlClient.query('INSERT INTO schedule (eventShortCode, admin) VALUES (:shortCode, :adminId)', { shortcode: args[0], adminId: message.author.id }, function (err, rows) {
            if (err) throw (err);
            console.log(rows);
            message.channel.send(`Created event with ID ${rows[0].info.insertId}`);
        });
        sqlClient.end();
    }

    if (command === "findfile") {
        try {
            let response = await drive.files.list({
                auth: jwtClient,
                q: `name = '${args[0]}' AND '${config.driveFolderId}' in parents`
            });
            console.log(response.data);
            if (response.data.files.length) {
                message.channel.send('File exists.');
            } else {
                message.channel.send('File does not exist.');
            }

        } catch (err) {
            console.log('The API returned an error: ' + err);
        }
    }

    if (command === "scheduletest") {
        let copyBody = { 'name': message.author.id };
        let createBody = { 'role': 'writer', 'type': 'anyone' };
        let newFileId;

        drive.files.copy({
            auth: jwtClient,
            fileId: config.templateFileId,
            resource: copyBody
        }, (err, response) => {
            if (err) {
                console.log('The API returned an error: ' + err);
                message.channel.send('The API returned an error: ' + err);
                return;
            } else {
                newFileId = response.data.id;
                console.log(`Attempting to set newFileId as ${newFileId} | ${response.data.id}`)
                console.log(response.data);
                message.channel.send('Successfully copied the file!');

                drive.permissions.create({
                    auth: jwtClient,
                    fileId: newFileId,
                    resource: createBody
                }, (err, response) => {
                    if (err) {
                        console.log('The API returned an error: ' + err);
                        message.channel.send('An error occured - please consult the logs.');
                        return;
                    } else {
                        console.log(response.data);
                        message.author.send(`You can access the file at https://docs.google.com/spreadsheets/d/${newFileId}`);
                    }
                });

            }
        });
    }

});

client.login(config.token);

/*
START TRANSACTION; INSERT INTO schedule (eventShortCode, adminId) VALUES (:shortCode, :creatorId);
SELECT @scheduleId:=LAST_INSERT_ID();

INSERT INTO fireteamMembers (guardianId, fireteamId) VALUES (:creatorId, @scheduleId);

UPDATE schedule
    SET joinCode = CONCAT(eventShortCode,'-',id),
    SET fireteamId = @scheduleId;
END;
*/
