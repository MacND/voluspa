// Require declarations
const Discord = require("discord.js");
const config = require("./config.json");
const { google } = require('googleapis');
const mysql = require('mysql2');
const key = require('./googleApiKey.json');
const moment = require('moment-timezone');
moment.locale('en-gb');

// Client declarations
const client = new Discord.Client({ disableEveryone: true });
const drive = google.drive('v3');
const sheets = google.sheets('v4');
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
var schedule;
var timers = [];

// Functions
async function getUsers() {
    var [rows, fields] = await pool.query('SELECT * FROM users;');
    registeredUsers = rows;
}

async function getEvents() {
    var [rows, fields] = await pool.query('SELECT * FROM events;');
    events = rows;
}

async function getSchedule() {
    var [rows, fields] = await pool.query('SELECT * FROM scheduleView;');
    schedule = await rows;

    for (let i = 0; i < schedule.length; i++) {
        try {
            var [rows, fields] = await pool.query({ sql: 'SELECT guardianId FROM fireteamMembers WHERE fireteamId = :fireteamId;', rowsAsArray: true }, { fireteamId: schedule[i].fireteamId });
            schedule[i].fireteamMembers = [].concat.apply([], rows);
        } catch (err) {
            console.log(err);
            message.reply('An error was thrown while trying to run the command - please check the logs.');
        }
    }
}

function createTimers() {
    /*
    for (let i = 0; i < schedule.length; i++) {
        let eventStart = moment(schedule[i].startTime);
        let now = moment();
        if (eventStart.isAfter(now)) {
            console.log(`${now} is after ${eventStart}`);
            for (let j = 0; j < schedule[i].fireteamMembers.length; j++) {
                console.log(`Creating timer for ${schedule[i].fireteamMembers[j]} in ${schedule[i].joinCode}`);
                let userId = schedule[i].fireteamMembers[j];
                setTimeout(() => {
                    client.users.get(userId).send(`You have an event beginning in 15 minutes - ${schedule[i].joinCode}`);
                }, moment.duration(eventStart.diff(now)).asMilliseconds() - 900000);
            }
        }

    }
    */
}


client.on("ready", async () => {
    console.log(`Successfully connected to Discord`);
    client.user.setActivity(config.status);
    getUsers();
    getEvents();
    getSchedule().then(createTimers);
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

    if (command === "info") {
        message.channel.send(`The Oracle Engine v1.0 - https://github.com/macnd/the-oracle-engine`);
    }


    if (command === "die" && message.author.id === '79711200312557568') {
        message.channel.send("Your light is lost...");
        client.destroy();
    }


    if (command === "eventinfo") {
        if (args[0]) {
            let event = events.find(o => o.shortCode == args[0].toLowerCase());
            if (event) {
                const embed = new Discord.RichEmbed()
                    .setTitle(`${event.name} (${event.eventType})`)
                    .setColor(5517157)
                    .setDescription(`\"*${event.eventTagline}*\"\n${event.eventDescription}\n\`\`\`Short code: ${event.shortCode}\nRecommended power: ${event.minPower}\nAverage length: ${moment().startOf('day').seconds(event.avgLength).format('H:mm')}\n\`\`\``)
                    .setURL(`${event.wikiLink}`)
                    .setThumbnail(`https://gamezone.cool/img/${event.shortCode}.png`)
                    .setFooter(`Gather your Fireteam - !suggest ${event.shortCode}`)

                message.channel.send(embed);
            } else {
                message.channel.send(`Couldn't find an event with shortcode ${args[0]}`);
            }
        } else {
            message.channel.send(`Please supply an event short code.`);
        }
    }


    if (command === "register" && args[0] && args[1]) {
        let user = registeredUsers.find(o => o.discordId == message.author.id),
            response;

        if (!user) {
            try {
                response = await drive.files.list({
                    auth: jwtClient,
                    q: `name = '${message.author.id}' AND '${config.driveFolderId}' in parents`
                });
                console.log(response.data);
            }
            catch (err) {
                console.log('The API returned an error: ' + err);
            }

            if ((args[0]).includes('#') && moment.tz.zone(args[1]) && !(response.data.files.length)) {
                let bnetId = args[0];
                let timezone = args[1];
                let discordId = message.author.id;
                let copyResponse, permsResponse;
                let copyBody = { 'name': message.author.id };
                let createBody = { 'role': 'writer', 'type': 'anyone' };
                let newFileId;

                try {
                    [rows, fields] = await pool.query('INSERT INTO users (discordId, bnetId, timezoneLocale) VALUES (:discordId, :bnetId, :timezone);', { discordId: discordId, bnetId: args[0], timezone: args[1] });
                    console.log(rows);
                    message.channel.send(`${message.author} registered BNet tag ${bnetId} with timezone ${timezone}`);
                } catch (err) {
                    console.log(err);
                    message.reply('An error was thrown while trying to run the command - please check the logs.');
                }


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
                    message.author.send(`Your schedule spreadsheet has been created and is accessible at https://docs.google.com/spreadsheets/d/${newFileId}.  Please keep this link private, as it is shared by URL with no other security.`);


                    try {
                        [rows, fields] = await pool.query('UPDATE users SET gsheeturl = :gsheeturl WHERE discordId = :discordId;', { discordId: discordId, gsheeturl: newFileId });
                        console.log(rows);
                        console.log('Updated gsheet URL in database.');
                    } catch (err) {
                        console.log(err);
                        message.reply('An error was thrown while trying to run the command - please check the logs.');
                    }

                } catch (err) {
                    console.log('The API returned an error: ' + err);
                    message.channel.send(`${message.author} error: there was an error while trying to register.  Please contact an admin.`);
                }

                try {
                    let sheetResponse = await sheets.spreadsheets.batchUpdate({
                        auth: jwtClient,
                        spreadsheetId: newFileId,
                        resource: {
                            "requests": [{
                                "updateSpreadsheetProperties": {
                                    "properties": {
                                        "timeZone": `${timezone}`,
                                        "title": `${discordId}`
                                    },
                                    "fields": "*"
                                }
                            }]
                        }
                    });
                    console.log(sheetResponse.data);
                } catch (err) {
                    console.log('The API returned an error: ' + err);
                }

                getUsers();

            } else {
                message.channel.send(`${message.author} malformed input - please ensure you are using your full BNet ID (including #) and a valid timezone.`);
            }
        } else {
            message.channel.send(`${message.author} Error: you may already be registered, or you did not specify both your BNet ID and Timezone`);
        }
    }


    if (command === "tz" || command === "timezone") {
        let user = registeredUsers.find(o => o.discordId == message.author.id);

        if (args[0] === 'help') {
            message.channel.send('You can find the list of acceptable timezones here: <https://github.com/MacND/the-oracle-engine/blob/master/timezones.json>');
            return;
        }

        if (user) {
            if (moment.tz.zone(args[0])) {
                if (args[0] !== user.timezoneLocale) {
                    try {
                        let [rows, fields] = await pool.query('UPDATE users SET timezoneLocale = :tz WHERE discordId = :discordId;', { discordId: message.author.id, tz: args[0] });
                        let sheetResponse = await sheets.spreadsheets.batchUpdate({
                            auth: jwtClient,
                            spreadsheetId: user.gsheeturl,
                            resource: {
                                "requests": [{
                                    "updateSpreadsheetProperties": {
                                        "properties": {
                                            "timeZone": `${args[0]}`,
                                            "title": `${user.discordId}`
                                        },
                                        "fields": "*"
                                    }
                                }]
                            }
                        });
                        message.react("✅");
                        console.log(sheetResponse.data);
                        getUsers();
                    } catch (err) {
                        console.log('ERROR: ' + err);
                    }
                } else {
                    message.channel.send(`Your timezone is already set to ${args[0]}`);
                }
            } else {
                message.channel.send('Invalid timezone supplied.');
            }
        } else {
            message.channel.send('Unable to find user - have you registered?');
        }
    }


    if (command === "bnet" || command === "battlenet") {
        let user = registeredUsers.find(o => o.discordId == message.author.id);

        if (user) {
            if (args[0].includes('#')) {
                if (args[0] != user.bnetId) {
                    pool.query('UPDATE users SET bnetId = :bnet WHERE discordId = :discordId;', { discordId: message.author.id, bnet: args[0] }, (err, rows) => {
                        if (err)
                            throw (err);
                        console.log(rows);
                        message.react("✅");
                    });

                    getUsers();
                } else {
                    message.channel.send(`Your BNet ID is already set to ${args[0]}`);
                }
            } else {
                message.channel.send('Invalid BNet ID supplied');
            }
        } else {
            message.channel.send('Unable to find user - have you registered?');
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
        getSchedule().then(createTimers);
        message.react("✅");
        console.log('Refreshed cache.');
    }


    if (command === "make") {
        if (args[0]) {
            let event = events.find(o => o.shortCode == args[0].toLowerCase());
            if (event) {
                try {
                    var [rows, fields] = await pool.query(`
                        START TRANSACTION; 
                        INSERT INTO schedule (eventShortCode, adminId) VALUES (:shortCode, :adminId);
                        SELECT @scheduleId:=LAST_INSERT_ID();
                        INSERT INTO fireteamMembers(guardianId, fireteamId) VALUES(:adminId, @scheduleId);
                        UPDATE schedule SET joinCode = CONCAT(eventShortCode, '-', id), fireteamId = @scheduleId WHERE id = @scheduleId;
                        COMMIT;`,
                        { shortCode: args[0], adminId: message.author.id });
                    message.reply(`Created event with ID ${args[0]}-${rows[1].insertId}`);
                    getSchedule();
                } catch (err) {
                    console.log(err);
                    message.reply('An error was thrown while trying to run the command - please check the logs.');
                }

            } else {
                message.channel.send(`Unable to find an event with shortcode ${args[0]}.`);
            }
        } else {
            message.channel.send(`Please supply an event shortcode.`);
        }
    }


    if (command === "schedule") {
        if (args[0]) {
            let scheduledEvent = schedule.find(o => o.joinCode == args[0].toLowerCase());
            if (scheduledEvent) {
                if (scheduledEvent.adminId === message.author.id) {
                    if (args[1] && args[2]) {
                        let creator = registeredUsers.find(o => o.discordId == message.author.id);

                        moment.tz.setDefault(creator.timezoneLocale);
                        let suggestedDateTime = moment.tz(moment(args[2], 'HH:mm').day(args[1]), creator.timezoneLocale);
                        moment.tz.setDefault();

                        if (suggestedDateTime < moment().tz(creator.timezoneLocale)) {
                            suggestedDateTime.add(7, 'd');
                        }

                        try {
                            var [rows, fields] = await pool.query('UPDATE schedule SET startTime = :suggestedTime WHERE joinCode = :joinCode AND adminId = :userId;', { suggestedTime: suggestedDateTime.utc().format('YYYY-MM-DD HH:mm:ss'), joinCode: args[0], userId: message.author.id });
                            console.log(rows);
                            message.reply(`Set start time of ${args[0]} to ${suggestedDateTime.format('YYYY-MM-DD HH:mm')} UTC`);
                            getSchedule().then(createTimers);
                        } catch (err) {
                            console.log(err);
                            message.reply('An error was thrown while trying to run the command - please check the logs.');
                        }

                    } else {
                        message.reply('Invalid date and time supplied.');
                    }
                } else {
                    message.reply(`You are not the admin of this event - the admin is ${client.users.get(scheduledEvent.adminId).tag}.`);
                }
            } else {
                message.reply('Could not find an event with the supplied join code.');
            }
        } else {
            message.reply('Please supply an event join code.');
        }
    }


    if (command === "join") {
        if (args[0]) {
            let scheduledEvent = schedule.find(o => o.joinCode == args[0].toLowerCase());
            console.log(scheduledEvent);
            if (scheduledEvent) {
                if (scheduledEvent.fireteamCount < 6) {
                    if (scheduledEvent.fireteamMembers.indexOf(message.author.id) <= -1) {
                        try {
                            var [rows, fields] = await pool.query('INSERT INTO fireteamMembers (guardianId, fireteamId) VALUES (:guardianId, :fireteamId);', { guardianId: message.author.id, fireteamId: scheduledEvent.fireteamId });
                            console.log(rows);
                            message.reply(`you have joined ${scheduledEvent.joinCode}`);
                            getSchedule().then(createTimers);
                        } catch (err) {
                            console.log(err);
                            message.reply('An error was thrown while trying to run the command - please check the logs.');
                        }
                    } else {
                        message.reply('You are already a member of this event\'s fireteam.');
                    }
                } else {
                    message.reply('This fireteam is currently full.');
                }
            } else {
                message.reply('Could not find an event with the supplied join code.');
            }
        } else {
            message.reply('Please supply an event join code.');
        }
    }


    if (command === "leave") {
        if (args[0]) {
            let scheduledEvent = schedule.find(o => o.joinCode == args[0].toLowerCase());
            if (scheduledEvent) {
                if (scheduledEvent.adminId != message.author.id) {
                    try {
                        var [rows, fields] = await pool.query('DELETE FROM fireteamMembers WHERE guardianId = :guardianId AND fireteamId = :fireteamId;', { guardianId: message.author.id, fireteamId: scheduledEvent.fireteamId });
                        console.log(rows);
                        message.reply(`left ${scheduledEvent.joinCode}`);
                        getSchedule().then(createTimers);
                    } catch (err) {
                        console.log(err);
                        message.reply('An error was thrown while trying to run the command - please check the logs.');
                    }
                } else {
                    message.reply('You are the admin of this event - you must elevate another user with the `!admin` command, and then you can leave.');
                }
            } else {
                message.reply('Could not find an event with the supplied join code.');
            }
        } else {
            message.reply('Please supply an event join code.');
        }
    }


    if (command === "kick") {
        if (args[0]) {
            if (args[1]) {
                let scheduledEvent = schedule.find(o => o.joinCode == args[0].toLowerCase());
                let userToKick = client.users.find(user => user.username.toLowerCase() === args[1].toLowerCase()).id;

                if (scheduledEvent) {
                    if (scheduledEvent.adminId == message.author.id) {
                        if (userToKick != message.author.id) {
                            if (scheduledEvent.fireteamMembers.indexOf(userToKick) > -1) {
                                try {
                                    var [rows, fields] = await pool.query('DELETE FROM fireteamMembers WHERE guardianId = :guardianId AND fireteamId = :fireteamId;', { guardianId: userToKick, fireteamId: scheduledEvent.fireteamId });
                                    console.log(rows);
                                    message.reply(`kicked ${client.users.get(userToKick).tag} from ${scheduledEvent.joinCode}.`);
                                    getSchedule().then(createTimers);
                                } catch (err) {
                                    console.log(err);
                                    message.reply('An error was thrown while trying to run the command - please check the logs.');
                                }
                            } else {
                                message.reply('The user you are trying to kick is not a member of this event.');
                            }
                        } else {
                            message.reply('You cannot kick yourself from an event.');
                        }
                    } else {
                        message.reply(`Only admins can kick people from events - please notify ${client.users.get(scheduledEvent.adminId).tag} if you require someone to be kicked.`);
                    }
                } else {
                    message.reply('Could not find an event with the supplied join code.');
                }
            } else {
                message.reply('Please supply a username to kick from the event.');
            }
        } else {
            message.reply('Please supply an event join code.');
        }
    }


    if (command === "admin") {
        if (args[0]) {
            if (args[1]) {
                let scheduledEvent = schedule.find(o => o.joinCode == args[0].toLowerCase());
                let userToMod = client.users.find(user => user.username.toLowerCase() === args[1].toLowerCase()).id;

                if (scheduledEvent) {
                    if (scheduledEvent.adminId == message.author.id) {
                        if (scheduledEvent.fireteamMembers.indexOf(userToMod) > -1) {
                            try {
                                var [rows, fields] = await pool.query('UPDATE schedule SET adminId = :adminId WHERE joinCode = :joinCode;', { adminId: userToMod, joinCode: scheduledEvent.joinCode });
                                console.log(rows);
                                message.reply(`has made ${client.users.get(userToMod).tag} the admin of ${scheduledEvent.joinCode}.`);
                                getSchedule();
                            } catch {
                                console.log(err);
                                message.reply('An error was thrown while trying to run the command - please check the logs.');
                            }
                        } else {
                            message.reply('The user you are trying to make an admin is not a member of this event.');
                        }
                    } else {
                        message.reply('You must be the admin of this event to elevate another user.');
                    }
                } else {
                    message.reply('Could not find an event with the supplied join code.');
                }
            } else {
                message.reply('Please supply a username to give admin rights to.');
            }
        } else {
            message.reply('Please supply an event join code.');
        }
    }


    if (command === "next") {
        let creator = registeredUsers.find(o => o.discordId == message.author.id);
        let messageString = "";
        schedule.forEach((scheduleLine, index) => {
            messageString += `${scheduleLine.name} - ${(scheduleLine.startTime ? `${moment(scheduleLine.startTime).tz(creator.timezoneLocale).format('YYYY-MM-DD HH:mm')} (${moment.tz(creator.timezoneLocale).format('Z')})` : 'Not Set')} \n!join ${scheduleLine.joinCode} | Length: ${scheduleLine.avgLength} | Power: ${scheduleLine.minPower} | Members: ${scheduleLine.fireteamCount}/6\n\n`;
        });

        message.channel.send((messageString ? `\`\`\`${messageString.trim()}\`\`\`` : "No events scheduled."));
    }

});

client.login(config.token);