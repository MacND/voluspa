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
function getUsers() {
    sqlClient.query('SELECT * FROM users;', (err, rows) => {
        if (err) throw (err);
        console.log('Pulled users from database.');
        registeredUsers = rows;
    });
    sqlClient.end();
}

function getEvents() {
    sqlClient.query('SELECT * FROM events;', (err, rows) => {
        if (err) throw (err);
        console.log('Pulled events from database.');
        events = rows;
    });
    sqlClient.end();
}

getUsers();
getEvents();

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

    if (command === "ping") {
        message.channel.send('Eyes up, Guardian.');
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
        let user = registeredUsers.find(o => o.discordId == message.author.id),
            response;

        if (!user) {
            try {
                response = await drive.files.list({
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
                let copyResponse, permsResponse;
                let copyBody = { 'name': message.author.id };
                let createBody = { 'role': 'writer', 'type': 'anyone' };
                let newFileId;

                sqlClient.query('INSERT INTO users (discordId, bnetId, timezoneLocale) VALUES (:discordId, :bnetId, :timezone);', { discordId: discordId, bnetId: args[0], timezone: args[1] }, function (err, rows) {
                    if (err)
                        throw (err);
                    console.log(rows);
                    message.channel.send(`${message.author} registered BNet tag ${bnetId} with timezone ${timezone}`);
                });

                try {
                    copyResponse = await drive.files.copy({
                        auth: jwtClient,
                        fileId: config.templateFileId,
                        resource: copyBody
                    });

                    newFileId = copyResponse.data.id;
                    console.log(copyResponse.data);

                    permsResponse = await drive.permissions.create({
                        auth: jwtClient,
                        fileId: newFileId,
                        resource: createBody
                    });

                    console.log(permsResponse.data);
                    message.author.send(`Your schedule spreadhseet has been created and is accessible at https://docs.google.com/spreadsheets/d/${newFileId}.  Please keep this link private, as it is shared by URL with no other security.`);

                    sqlClient.query('UPDATE users SET gsheeturl = :gsheetId WHERE discordId = :discordId;', { discordId: discordId, gsheeturl: newFileId }, (err, rows) => {
                        if (err)
                            throw (err);
                        console.log(rows);
                        console.log('Updated gsheet URL in database.');
                    });

                    sqlClient.end();

                } catch (err) {
                    console.log('The API returned an error: ' + err);
                    message.channel.send(`${message.author} error: there was an error while trying to register.  Please contact an admin.`);
                }

                getUsers();

            } else {
                message.channel.send(`${message.author} malformed input - please ensure you are using your full BNet ID (including #) and a valid timezone.`);
            }
        } else {
            message.channel.send(`${message.author} Error: you may already be registered, or you did not specify both your BNet ID and Timezone`);
        }
    }


    if (command === "timezone") {
        let user = registeredUsers.find(o => o.discordId == message.author.id);

        if (args[0] === 'help') {
            message.channel.send('You can find the list of acceptable timezones here: <https://github.com/MacND/the-oracle-engine/blob/master/timezones.json>');
            return;
        }

        if (user) {
            if (moment.tz.zone(args[0])) {
                if (args[0] !== user.timezoneLocale) {
                    sqlClient.query('UPDATE users SET timezoneLocale = :tz WHERE discordId = :discordId;', { discordId: message.author.id, tz: args[0] }, (err, rows) => {
                        if (err)
                            throw (err);
                        console.log(rows);
                        message.channel.send(`${message.author} updated timezone to ${args[0]}.`);
                    });
                    sqlClient.end();
                    getUsers();
                }
            } else {
                message.channel.send('Invalid timezone supplied.');
            }
        } else {
            message.channel.send('Could not found registered user.');
        }
    }


    if (command === "bnet") {
        let user = registeredUsers.find(o => o.discordId == message.author.id);

        if (user && args[0].includes('#') && (args[0] != user.bnetId)) {
            sqlClient.query('UPDATE users SET bnetId = :bnet WHERE discordId = :discordId;', { discordId: message.author.id, bnet: args[0] }, (err, rows) => {
                if (err)
                    throw (err);
                console.log(rows);
                message.channel.send(`${message.author} updated BNet ID to ${args[0]}`);
            });
            sqlClient.end();
            getUsers();
        } else {
            message.react("❌");
        }
    }


    if (command === "userinfo") {
        let searchUserId = (args[0] ? client.users.find(user => user.username.toLowerCase() === args[0].toLowerCase()).id : message.author.id);
        let user = registeredUsers.find(o => o.discordId == searchUserId);

        if (!user) {
            message.channel.send(`${client.users.get(searchUserId).tag} is not registered.`);
        } else {
            message.channel.send(`User information for ${client.users.get(searchUserId).tag}\`\`\`BNet ID: ${user.bnetId}\nTimezone: ${user.timezoneLocale}\`\`\``);
        }

    }


    if (command === "refresh" && message.author.id === '79711200312557568') {
        getEvents();
        getUsers();
        message.channel.send('Pulled users and events from database.');
        console.log('Refreshed cache of users and events.');
    }

    /*
    if (command === "suggest" && args[0]) {
        sqlClient.query('INSERT INTO schedule (eventShortCode, admin) VALUES (:shortCode, :adminId)', { shortcode: args[0], adminId: message.author.id }, function (err, rows) {
            if (err) throw (err);
            console.log(rows);
            message.channel.send(`Created event with ID ${rows[0].info.insertId}`);
        });
        sqlClient.end();
    }
    */

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

