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
    events,
    history;

// Functions and Helpers
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

async function pullEvents() {
    events = await db.getEvents();
    createTimers();
}

async function pullHistory() {
    history = await db.getHistory();
    history = history.sort(history.finishTime);
}

function createTimers() {
    for (let i = 0; i < events.length; i++) {
        let eventStart = moment(events[i].startTime);
        if (events[i].startTime && eventStart.isAfter(moment.utc())) {
            let activityData = activities.find(o => o.shortCode == events[i].shortCode);

            Timer.set(events[i].joinCode, () => {
                events[i].fireteam.split(',').forEach((member, index) => {
                    let user = registeredUsers.find(o => o.discordId == member)
                    client.users.get(member).send(`In 10 minutes you are scheduled to take part in **${events[i].joinCode}** (${activityData.name} ${activityData.eventType}).  In your timezone: ${moment(events[i].startTime).tz(user.timezone).format('MMMM Do [@] HH:mm z')}.  This will take around ${moment.duration(activityData.avgLength, 'seconds').format("h [hours] mm [minutes]")}.`);
                })
            }, eventStart.clone().subtract(10, "minutes").toDate());
            console.log(`Setting timer with name ${events[i].joinCode} set to ping at ${eventStart.clone().subtract(10, "minutes").toDate()}`);
        }
    }
}


client.on("ready", async () => {
    console.log(`Successfully connected to Discord`);
    client.user.setActivity(config.status);
    activities = await db.getActivities();
    registeredUsers = await db.getUsers();
    await pullEvents();
    await pullHistory();
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


        if (command === "die" && message.author.id === config.ownerId) {
            message.channel.send("Your light is lost...")
                .then(client.destroy());
        }


        if (command === "raidinfo") {
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
                message.channel.send(`Available raids: ${activities.map(function (elem) { return elem.shortCode }).join(", ")}.`);
            }
        }


        if (command === "register" && args[0] && args[1]) {
            let user = registeredUsers.find(o => o.discordId == message.author.id),
                response;

            if (!user) {
                try {
                    response = await google.getFiles(message.author.id);
                }
                catch (err) {
                    console.log('The API returned an error: ' + err);
                }

                if ((args[0]).includes('#') && moment.tz.zone(args[1]) && !(response.data.files.length)) {
                    let bnetId = args[0];
                    let timezone = args[1];
                    let discordId = message.author.id;
                    let copyResponse, permsResponse;

                    try {
                        await db.postUser(discordId, bnetId, timezone);
                        copyResponse = await google.createTimetable(discordId);
                        permsResponse = await google.shareTiemtable(copyResponse.id);
                        message.author.send(`Your schedule spreadsheet has been created and is accessible at https://docs.google.com/spreadsheets/d/${copyResponse.id}.  Please keep this link private, as it is shared by URL with no other security.`);
                        await db.putUserGsheet(discordId, copyResponse.id);
                        await google.setTimetableTimezone(copyResponse.id, discordId, timezone)
                        registeredUsers = await db.getUsers();
                        message.channel.send(`${message.author} registered BNet tag ${bnetId} with timezone ${timezone}`);
                    } catch (err) {
                        console.log(err);
                        message.reply('an error was thrown while trying to run the command - please check the logs.');
                    }

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
                            await db.putUserTimezone(args[0], message.author.id);
                            await google.setTimetableTimezone(user.gsheeturl, user.discordId, args[0]);
                            registeredUsers = await db.getUsers();
                            message.react("✅");
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
                        db.putUserBnet(bnet, message.author.id);
                        registeredUsers = await db.getUsers();
                        message.react("✅");
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


        if (command === "refresh" && message.author.id === config.ownerId) {
            activities = await db.getActivities();
            registeredUsers = await db.getUsers();
            await pullEvents();
            message.react("✅");
        }


        if (command === "make") {
            if (args[0]) {
                let activity = activities.find(o => o.shortCode == args[0].toLowerCase());
                if (activity) {
                    try {
                        let res = await db.postEvent(activity.shortCode, message.author.id, moment.utc().format('YYYY-MM-DD HH:mm'))
                            .then(await pullEvents());
                        let event = events.find(o => o.id == res[1].insertId);
                        console.log(res);
                        message.reply(`created event with ID ${event.joinCode}`);
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
                                res = await db.putEventStartTime(suggestedDateTime.utc().format('YYYY-MM-DD HH:mm'), event.joinCode, creator.discordId)
                                    .then(await pullEvents());
                                message.reply(`set start time of ${args[0]} to ${suggestedDateTime.format('YYYY-MM-DD HH:mm')} UTC`);
                            } catch (err) {
                                console.log(err);
                                message.reply('an error was thrown while trying to run the command - please check the logs.');
                            }

                        } else {
                            message.reply('invalid date and time supplied.');
                        }
                    } else {
                        message.reply(`you are not the admin of this event - the admin is ${client.users.get(event.adminId).tag}.`);
                    }
                } else {
                    message.reply('could not find an event with the supplied join code.');
                }
            } else {
                message.reply('please supply an event join code.');
            }
        }


        if (command === "fireteam") {
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
                                    await db.putFireteam(user.discordId, event.fireteamId);
                                    await pullEvents();
                                    message.reply(`you have joined ${event.joinCode}`);
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
                            await deleteFireteamMember(message.author.id, event.fireteamId)
                                .then(await pullEvents())
                                .then(message.reply(`left ${event.joinCode}`));
                        } catch (err) {
                            console.log(err);
                            message.reply('an error was thrown while trying to run the command - please check the logs.');
                        }
                    } else {
                        message.reply('you are the admin of this event - you must elevate another user with the `!admin` command, and then you can leave.');
                    }
                } else {
                    message.reply('could not find an event with the supplied join code.');
                }
            } else {
                message.reply('please supply an event join code.');
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
                                        await deleteFireteamMember(userToKick, event.fireteamId)
                                            .then(await pullEvents())
                                            .then(message.reply(`kicked ${client.users.get(userToKick).tag} from ${event.joinCode}.`));
                                    } catch (err) {
                                        console.log(err);
                                        message.reply('an error was thrown while trying to run the command - please check the logs.');
                                    }
                                } else {
                                    message.reply('the user you are trying to kick is not a member of this event.');
                                }
                            } else {
                                message.reply('you cannot kick yourself from an event.');
                            }
                        } else {
                            message.reply(`only admins can kick people from events - please notify ${client.users.get(event.adminId).tag} if you require someone to be kicked.`);
                        }
                    } else {
                        message.reply('could not find an event with the supplied join code.');
                    }
                } else {
                    message.reply('please supply a username to kick from the event.');
                }
            } else {
                message.reply('please supply an event join code.');
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
                                    await db.putEventAdmin(event.joinCode, userToMod);
                                    await pullEvents();
                                    message.reply(`has made ${client.users.get(userToMod).tag} the admin of ${event.joinCode}.`);
                                } catch (err) {
                                    console.log(err);
                                    message.reply('an error was thrown while trying to run the command - please check the logs.');
                                }
                            } else {
                                message.reply('the user you are trying to make an admin is not a member of this event.');
                            }
                        } else {
                            message.reply('you must be the admin of this event to elevate another user.');
                        }
                    } else {
                        message.reply('could not find an event with the supplied join code.');
                    }
                } else {
                    message.reply('please supply a username to give admin rights to.');
                }
            } else {
                message.reply('please supply an event join code.');
            }
        }

        if (command === "cancel") {
            if (args[0]) {
                let event = events.find(o => o.joinCode == args[0].toLowerCase());

                if (event) {
                    if (event.adminId == message.author.id) {
                        try {
                            await db.deleteEvent(event.joinCode)
                                .then(db.deleteFireteam(event.fireteamId))
                                .then(await pullEvents())
                                .then(message.reply(`deleted event ${event.joinCode} and its fireteam.`));
                        } catch (err) {
                            console.log(err);
                            message.reply('an error was thrown while trying to run the command - please check the logs.');
                        }
                    } else {
                        message.reply(`only admins can cancel events - please notify ${client.users.get(event.adminId).tag} to cancel this event.`);
                    }
                } else {
                    message.reply('could not find an event with the supplied join code.');
                }
            } else {
                message.reply('please supply an event join code.');
            }
        }


        if (command === "finish") {
            if (args[0]) {
                let event = events.find(o => o.joinCode == args[0].toLowerCase());

                if (event) {
                    if (event.adminId == message.author.id) {
                        if (moment(event.startTime).utc() < moment.utc()) {
                            try {
                                await db.putEventFinishTime(event.joinCode, moment.utc().format('YYYY-MM-DD HH:mm'));
                                await pullEvents();
                                message.reply(`marked ${args[0]} as completed with a length of ${moment.duration(moment.utc().diff(event.startTime)).format('H [hours,] mm [minutes]')}.`);
                            } catch {
                                console.log(err);
                                message.reply('an error was thrown while trying to run the command - please check the logs.');
                            }
                        } else {
                            message.reply('you cannot finish an event that has not started.');
                        }
                    } else {
                        message.reply(`only admins can complete events - please notify ${client.users.get(event.adminId).tag} to complete this event.`);
                    }
                } else {
                    message.reply('could not find an event with the supplied join code.');
                }
            } else {
                message.reply('please supply an event join code.');
            }
        }


        if (command === "report" || command === "rr") {
            if (args[0]) {
                let event = events.find(o => o.joinCode == args[0].toLowerCase());

                if (event) {
                    if (event.adminId == message.author.id) {
                        try {
                            await db.putEventRaidReport(event.joinCode, args[1]);
                            await pullEvents();
                            message.reply(`set the Raid Report link for this event to <${args[1]}>`);
                        } catch {
                            console.log(err);
                            message.reply('an error was thrown while trying to run the command - please check the logs.');
                        }
                    } else {
                        message.reply(`only admins can complete events - please notify ${client.users.get(event.adminId).tag} to complete this event.`);
                    }
                } else {
                    message.reply('could not find an event with the supplied join code.');
                }
            } else {
                message.reply('please supply an event join code.');
            }
        }


        if (command === "next") {
            let creator = registeredUsers.find(o => o.discordId == message.author.id);
            let messageString = "";

            for (let i = 0; i < events.length; i++) {
                messageString += `${events[i].name} - ${(events[i].startTime ? `${moment(events[i].startTime).tz((creator ? creator.timezone : 'UTC')).format('MMMM Do [@] HH:mm (z)')}` : 'Not Set')} \n!join ${events[i].joinCode} | Length: ${events[i].avgLength} | Power: ${events[i].minPower} | Members: ${events[i].fireteam.split(',').length}/6\n\n`;
            }

            message.channel.send((messageString ? `\`\`\`${messageString.trim()}\`\`\`` : "No events scheduled."));
        }


        if (command === "history") {
            let creator = registeredUsers.find(o => o.discordId == message.author.id);
            let messageString = "";

            for (let i = 0; i < history.length; i++) {
                messageString += `${history[i].joinCode} - Started ${moment(history[i].startTime).tz((creator ? creator.timezone : 'UTC')).format('MMMM Do [@] HH:mm (z)')}\nRaid Report: ${history[i].raidReportUrl}\n\n`;
            }

            message.channel.send(`\`\`\`${messageString.trim()}\`\`\``);
        }

    })
};

client.login(config.token);