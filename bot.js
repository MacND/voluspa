// Require modules
const Discord = require("discord.js");
const google = require('./google/google.js');
const db = require('./db/db.js');
const moment = require('moment-timezone');
const momentDurationFormatSetup = require("moment-duration-format");
momentDurationFormatSetup(moment);
typeof moment.duration.fn.format === "function";
typeof moment.duration.format === "function";
moment.locale('en-gb');

// Require files
const config = require("./config.json");


// Client declarations
const client = new Discord.Client({ disableEveryone: true });


// Variable declarations
let activities,
    registeredUsers,
    events;

// Functions
let Timer = {
    map: new Map(),
    set: (key, func, time) => {
        if (time instanceof Date) {
            time = time.getTime() - Date.now();
        }
        if (time < 0) {
            throw new Error("Can't set timer in the past");
        }
        Timer.cancel(key);
        Timer.map.set(key, setTimeout(func, time));
    },
    cancel: key => {
        clearTimeout(Timer.map.get(key));
    }
}

function createTimers() {
    for (let i = 0; i < events.length; i++) {
        if (events[i].startTime) {
            let eventStart = moment(events[i].startTime);
            let now = moment();
            let members = "";
            let activityData = activities.find(o => o.shortCode == events[i].shortCode);
            console.log(activityData);

            events[i].fireteamMembers.forEach((member, index) => {
                members += `${client.users.get(member)} `;
            });

            Timer.set(events[i].joinCode, () => {
                client.channels.get('517651218961530888').send(`Alerting ${members.trim()}\nYou have an event beginning in 15 minutes, at ${moment(events[i].startTime).format('MMMM Do HH:mm')} - **${events[i].joinCode}** (${activityData.name} ${activityData.eventType}) - Approx. ${activityData.avgLength}`);
            }, moment.duration(eventStart.diff(now)).asMilliseconds() - 900000);
        }
    }
}


client.on("ready", async () => {
    console.log(`Successfully connected to Discord`);
    client.user.setActivity(config.status);
    activities = await db.getActivities();
    registeredUsers = await db.getUsers();
    events = await db.getEvents();
    initListeners();
});

function initListeners() {
    client.on("message", async message => {
        if (message.author.bot) return;
        if (message.content.indexOf(config.prefix) !== 0) return;

        const args = message.content.slice(config.prefix.length).trim().match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g);
        args.forEach((arg, index) => {
            args[index] = arg.replace(/"/g, "");
        });

        const command = args.shift().toLowerCase();

        if (command === "info") {
            message.channel.send(`The Oracle Engine - <https://github.com/macnd/the-oracle-engine>`);
        }


        if (command === "die" && message.author.id === '79711200312557568') {
            message.channel.send("Your light is lost...");
            client.destroy();
        }


        if (command === "eventinfo") {
            if (args[0]) {
                let event = activities.find(o => o.shortCode == args[0].toLowerCase());
                if (event) {
                    const embed = new Discord.RichEmbed()
                        .setTitle(`${event.name} (${event.eventType})`)
                        .setColor(5517157)
                        .setDescription(`\"*${event.eventTagline}*\"\n${event.eventDescription}\n\`\`\`Short code: ${event.shortCode}\nRecommended power: ${event.minPower}\nAverage length: ${moment().startOf('day').seconds(event.avgLength).format('H:mm')}\n\`\`\``)
                        .setURL(`${event.wikiLink}`)
                        .setThumbnail(`https://gamezone.cool/img/${event.shortCode}.png`)
                        .setFooter(`Gather your Fireteam - !make ${event.shortCode}`)

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
                        [rows, fields] = await pool.query('INSERT INTO users (discordId, bnetId, timezone) VALUES (:discordId, :bnetId, :timezone);', { discordId: discordId, bnetId: args[0], timezone: args[1] });
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
                    if (args[0] !== user.timezone) {
                        try {
                            let [rows, fields] = await pool.query('UPDATE users SET timezone = :tz WHERE discordId = :discordId;', { discordId: message.author.id, tz: args[0] });
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
            let bnet = args[0]
            if (user) {
                if (bnet.includes('#')) {
                    if (bnet != user.bnetId) {
                        db.putUserBnet(bnet, message.author.id).then(registeredUsers = await db.getUsers())
                            .then(message.react("✅"));
                    } else {
                        message.channel.send(`Your BNet ID is already set to ${bnet}`);
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
                message.channel.send(`User information for ${client.users.get(searchUserId).tag}\`\`\`BNet ID: ${user.bnetId}\nTimezone: ${user.timezone}\`\`\``);
            }
        }


        if (command === "refresh" && message.author.id === '79711200312557568') {
            activities = await db.getActivities();
            registeredUsers = await db.getUsers();
            events = await db.getEvents();
            message.react("✅");
        }


        if (command === "make") {
            if (args[0]) {
                let activity = activities.find(o => o.shortCode == args[0].toLowerCase());
                if (activity) {
                    try {
                        let res = await db.postEvent(activity.shortCode, message.author.id, moment.utc().format('YYYY-MM-DD HH:mm'))
                            .then(events = await db.getEvents());
                        let event = events.find(o => o.id == res[1].insertId);
                        message.reply(`Created event with ID ${event.joinCode}`);
                    } catch (err) {
                        console.log(err);
                        message.reply('a error was thrown while trying to run the command - please check the logs.');
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
                let event = events.find(o => o.joinCode == args[0].toLowerCase());
                if (event) {
                    if (event.adminId === message.author.id) {
                        if (args[1] && args[2]) {
                            let creator = registeredUsers.find(o => o.discordId == message.author.id);

                            moment.tz.setDefault(creator.timezone);
                            let suggestedDateTime = moment.tz(moment(args[2], 'HH:mm').day(args[1]), creator.timezone);
                            moment.tz.setDefault();

                            if (suggestedDateTime < moment().tz(creator.timezone)) {
                                suggestedDateTime.add(7, 'd');
                            }

                            try {
                                res = await db.putEventStartTime(suggestedDateTime.format('YYYY-MM-DD HH:mm'), event.joinCode, creator.discordId)
                                    .then(events = await db.getEvents());
                                message.reply(`Set start time of ${args[0]} to ${suggestedDateTime.format('YYYY-MM-DD HH:mm')} UTC`);
                            } catch (err) {
                                console.log(err);
                                message.reply('An error was thrown while trying to run the command - please check the logs.');
                            }

                        } else {
                            message.reply('Invalid date and time supplied.');
                        }
                    } else {
                        message.reply(`You are not the admin of this event - the admin is ${client.users.get(event.adminId).tag}.`);
                    }
                } else {
                    message.reply('Could not find an event with the supplied join code.');
                }
            } else {
                message.reply('Please supply an event join code.');
            }
        }


        if (command === "members") {
            if (args[0]) {
                let event = events.find(o => o.joinCode == args[0].toLowerCase());
                if (event) {
                    let messageString = "";
                    event.fireteam.split(',').forEach((member, index) => {
                        messageString += `${client.users.get(member).tag}${(member == event.adminId ? " (Admin)" : "")}\n`;
                    });
                    message.channel.send(`Fireteam for ${event.joinCode}\n\`\`\`${messageString}\`\`\``);
                }
            }
        }


        if (command === "join") {
            if (args[0]) {
                let event = events.find(o => o.joinCode == args[0].toLowerCase());
                let user = registeredUsers.find(o => o.discordId == message.author.id);
                console.log(event);
                if (user) {
                    if (event) {
                        if (event.fireteam.split(',').length < 6) {
                            if (event.fireteam.split(',').indexOf(message.author.id) <= -1) {
                                try {
                                    let res = db.putFireteam(user.discordId, event.fireteamId)
                                        .then(events = await db.getEvents())
                                        .then(message.reply(`you have joined ${event.joinCode}`));
                                } catch (err) {
                                    console.log(err);
                                    message.reply('an error was thrown while trying to run the command - please check the logs.');
                                }
                            } else {
                                message.reply('you are already a member of this event\'s fireteam.');
                            }
                        } else {
                            message.reply('this fireteam is currently full.');
                        }
                    } else {
                        message.reply('could not find an event with the supplied join code.');
                    }
                } else {
                    message.reply('please supply an event join code.');
                }
            } else {
                message.reply('unable to join event - are you registered?')
            }
        }


        if (command === "leave") {
            if (args[0]) {
                let event = events.find(o => o.joinCode == args[0].toLowerCase());
                if (event) {
                    if (event.adminId != message.author.id) {
                        try {
                            var [rows, fields] = await pool.query('DELETE FROM fireteamMembers WHERE guardianId = :guardianId AND fireteamId = :fireteamId;', { guardianId: message.author.id, fireteamId: event.fireteamId });
                            console.log(rows);
                            message.reply(`left ${event.joinCode}`);
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
                    let event = events.find(o => o.joinCode == args[0].toLowerCase());
                    let userToKick = client.users.find(user => user.username.toLowerCase() === args[1].toLowerCase()).id;

                    if (event) {
                        if (event.adminId == message.author.id) {
                            if (userToKick != message.author.id) {
                                if (event.fireteam.split(',').indexOf(userToKick) > -1) {
                                    try {
                                        var [rows, fields] = await pool.query('DELETE FROM fireteamMembers WHERE guardianId = :guardianId AND fireteamId = :fireteamId;', { guardianId: userToKick, fireteamId: event.fireteamId });
                                        console.log(rows);
                                        message.reply(`kicked ${client.users.get(userToKick).tag} from ${event.joinCode}.`);
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
                            message.reply(`Only admins can kick people from events - please notify ${client.users.get(event.adminId).tag} if you require someone to be kicked.`);
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
                    let event = events.find(o => o.joinCode == args[0].toLowerCase());
                    let userToMod = client.users.find(user => user.username.toLowerCase() === args[1].toLowerCase()).id;

                    if (event) {
                        if (event.adminId == message.author.id) {
                            if (event.fireteam.split(',').indexOf(userToMod) > -1) {
                                try {
                                    var [rows, fields] = await pool.query('UPDATE events SET adminId = :adminId WHERE joinCode = :joinCode;', { adminId: userToMod, joinCode: event.joinCode });
                                    console.log(rows);
                                    message.reply(`has made ${client.users.get(userToMod).tag} the admin of ${event.joinCode}.`);
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

        if (command === "cancel") {
            if (args[0]) {
                let event = events.find(o => o.joinCode == args[0].toLowerCase());

                if (event) {
                    if (event.adminId == message.author.id) {
                        try {
                            let res = await db.deleteEvent(event.joinCode)
                                .then(db.deleteFireteam(event.fireteamId))
                                .then(events = await db.getEvents());
                            message.reply(`Deleted event ${event.joinCode} and its fireteam.`);
                        } catch (err) {
                            console.log(err);
                            message.reply('An error was thrown while trying to run the command - please check the logs.');
                        }
                    } else {
                        message.reply(`Only admins can cancel events - please notify ${client.users.get(event.adminId).tag} to cancel this event.`);
                    }
                } else {
                    message.reply('Could not find an event with the supplied join code.');
                }
            } else {
                message.reply('Please supply an event join code.');
            }
        }


        if (command === "finish") {
            if (args[0]) {
                let event = events.find(o => o.joinCode == args[0].toLowerCase());

                if (event) {
                    if (event.adminId == message.author.id) {
                        if (moment(event.startTime).utc() < moment.utc()) {
                            try {
                                var [rows, fields, err] = await pool.query(`UPDATE events SET finishTime = :finishTime WHERE joinCode = :joinCode`,
                                    { finishTime: moment.utc().format('YYYY-MM-DD HH:mm'), joinCode: args[0] });
                                console.log(rows);
                                message.reply(`Marked ${args[0]} as completed with a length of ${moment.duration(moment.utc().diff(event.startTime)).format('H [hours,] mm [minutes]')}.`);
                                getSchedule().then(createTimers);
                            } catch {
                                console.log(err);
                                message.reply('An error was thrown while trying to run the command - please check the logs.');
                            }
                        } else {
                            message.reply('You cannot finish an event that has not started.');
                            console.log(`${moment(event.startTime).utc().format('YYYY-MM-DD HH:mm')} is after ${moment.utc().format('YYYY-MM-DD HH:mm')}`);
                        }
                    } else {
                        message.reply(`Only admins can complete events - please notify ${client.users.get(event.adminId).tag} to complete this event.`);
                    }
                } else {
                    message.reply('Could not find an event with the supplied join code.');
                }
            } else {
                message.reply('Please supply an event join code.');
            }
        }


        if (command === "report") {
            if (args[0]) {
                let event = events.find(o => o.joinCode == args[0].toLowerCase());

                if (event) {
                    if (event.adminId == message.author.id) {
                        try {
                            var [rows, fields] = await pool.query(`UPDATE events SET raidReportUrl = :rr WHERE joinCode = :joinCode`,
                                { rr: args[1], joinCode: args[0] });
                            console.log(rows);
                            message.reply(`Set the Raid Report link for this event to <${args[1]}>`);
                            getSchedule().then(createTimers);
                        } catch {
                            console.log(err);
                            message.reply('An error was thrown while trying to run the command - please check the logs.');
                        }
                    } else {
                        message.reply(`Only admins can complete events - please notify ${client.users.get(event.adminId).tag} to complete this event.`);
                    }
                } else {
                    message.reply('Could not find an event with the supplied join code.');
                }
            } else {
                message.reply('Please supply an event join code.');
            }
        }


        if (command === "next") {
            let creator = registeredUsers.find(o => o.discordId == message.author.id);
            let messageString = "";

            for (let i = 0; i < events.length; i++) {
                messageString += `${events[i].name} - ${(events[i].startTime ? `${moment(events[i].startTime).tz(creator.timezone).format('YYYY-MM-DD HH:mm (Z)')}` : 'Not Set')} \n!join ${events[i].joinCode} | Length: ${events[i].avgLength} | Power: ${events[i].minPower} | Members: ${events[i].fireteam.split(',').length}/6\n\n`;
            }

            message.channel.send((messageString ? `\`\`\`${messageString.trim()}\`\`\`` : "No events scheduled."));
        }


        if (command === "proud") {
            let emoji = client.emojis.find(emoji => emoji.name === "MadeShaxxProud");
            message.react(emoji.id);
        }


        if (command === "invite") {
            message.author.send(`You can invite me to a server you manage by using this link - ${config.invite}`);
            message.react("✅");
        }

    })
};

client.login(config.token);