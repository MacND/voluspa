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

        if (!events[i].startTime || !eventStart.isAfter(moment.utc())) {
            return;
        }

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


        if (command === "die") {
            if (message.author.id !== config.ownerId) {
                return;
            }
            message.channel.send("Your light is lost...");
            client.destroy();
        }


        if (command === "raidinfo") {
            if (!args[0]) {
                message.channel.send(`Available raids: ${activities.map(function (elem) { return elem.shortCode }).join(", ")}.`);
                return;
            }

            let event = activities.find(o => o.shortCode == args[0].toLowerCase());

            if (!event) {
                message.channel.send(`Couldn't find an event with shortcode ${args[0]}`);
                return;
            }

            let embed = new Discord.RichEmbed()
                .setTitle(`${event.name} (${event.eventType})`)
                .setColor(5517157)
                .setDescription(`*"${event.eventTagline}"*\n${event.eventDescription}\n\`\`\`Short code: ${event.shortCode}\nRecommended power: ${event.minPower}\nAverage length: ${moment().startOf('day').seconds(event.avgLength).format('H:mm')}\n\`\`\``)
                .setURL(`${event.wikiLink}`)
                .setThumbnail(`https://gamezone.cool/img/${event.shortCode}.png`)
                .setFooter(`Gather your Fireteam - !make ${event.shortCode}`)

            message.channel.send(embed);
        }


        if (command === "register") {
            let user = registeredUsers.find(o => o.discordId == message.author.id);

            if (!user) {
                message.reply('you appear to already be registered - do `!userinfo` to view your current details.');
                return;
            }

            if (!args[0] || !args[0].includes('#')) {
                message.reply(`invalid Battle.Net ID supplied - please ensure you are using your full BNet ID, including the # dsicriminator.`);
                return;
            }

            if (!args[1] || !moment.tz.zone(args[1])) {
                message.reply(`invalid timezone supplied - for a list of acceptable timezones, do \`!timezone help\`.`);
                return;
            }

            let response = await google.getFiles(message.author.id);
            let bnetId = args[0];
            let timezone = args[1];
            let discordId = message.author.id;

            if (response.data.files.length) {
                message.reply(`you already have a schedule spreadsheet - registration has not completed, please contact an admin.`);
                return;
            }

            try {
                await db.postUser(discordId, bnetId, timezone);
                let copyResponse = await google.createTimetable(discordId);
                await google.shareTiemtable(copyResponse.id);
                message.author.send(`Your schedule spreadsheet has been created and is accessible at https://docs.google.com/spreadsheets/d/${copyResponse.id}.  Please keep this link private, as it is shared by URL with no other security.`);
                await db.putUserGsheet(discordId, copyResponse.id);
                await google.setTimetableTimezone(copyResponse.id, discordId, timezone)
                registeredUsers = await db.getUsers();
                message.reply(`you have registered BNet tag ${bnetId} with timezone ${timezone}.`);
            } catch (err) {
                console.log(err);
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }
        }



        if (["tz", "timezone"].contains(command)) {
            if (args[0] === 'help') {
                message.channel.send('You can find the list of acceptable timezones here: <https://github.com/MacND/the-oracle-engine/blob/master/timezones.json>');
                return;
            }

            let user = registeredUsers.find(o => o.discordId == message.author.id);

            if (!user) {
                message.reply('you don\'t appear to be registered - please register first.');
                return;
            }

            if (!moment.tz.zone(args[0])) {
                message.channel.send('Invalid timezone supplied.');
                return;
            }

            if (args[0] === user.timezone) {
                message.channel.send(`Your timezone is already set to ${args[0]}`);
                return;
            }

            try {
                await db.putUserTimezone(args[0], message.author.id);
                await google.setTimetableTimezone(user.gsheeturl, user.discordId, args[0]);
                registeredUsers = await db.getUsers();
                message.react("✅");
            } catch (err) {
                console.log('ERROR: ' + err);
            }

        }


        if (["bnet", "battlenet"].contains(command)) {
            let user = registeredUsers.find(o => o.discordId == message.author.id);
            let bnet = args[0]

            if (!user) {
                message.channel.send('Unable to find user - have you registered?');
                return;
            }

            if (!bnet.includes('#')) {
                message.channel.send('Invalid BNet ID supplied');
                return;
            }

            if (bnet === user.bnetId) {
                message.channel.send(`Your BNet ID is already set to ${bnet}`);
                return;
            }

            await db.putUserBnet(bnet, message.author.id);
            registeredUsers = await db.getUsers();
            message.react("✅");
        }


        if (command === "userinfo") {
            let searchUserId = (args[0] ? client.users.find(user => user.username.toLowerCase() === args[0].toLowerCase()).id : message.author.id);
            let user = registeredUsers.find(o => o.discordId == searchUserId);

            if (!user) {
                message.channel.send(`${client.users.get(searchUserId).username} is not registered.`);
                return;
            }

            message.channel.send(`User information for ${client.users.get(searchUserId).username}:\`\`\`BNet ID: ${user.bnetId}\nTimezone: ${user.timezone}\`\`\``);

        }


        if (command === "refresh" && message.author.id === config.ownerId) {
            activities = await db.getActivities();
            registeredUsers = await db.getUsers();
            await pullEvents();
            await pullHistory();
            message.react("✅");
        }


        if (command === "make") {
            if (!args[0]) {
                message.channel.send(`Please supply an event shortcode.`);
                return;
            }

            let activity = activities.find(o => o.shortCode == args[0].toLowerCase());

            if (!activity) {
                message.channel.send(`Unable to find an event with shortcode ${args[0]}.`);
                return;
            }

            try {
                let res = await db.postEvent(activity.shortCode, message.author.id, moment.utc().format('YYYY-MM-DD HH:mm'));
                await pullEvents();
                let event = events.find(o => o.id == res[1].insertId);
                message.reply(`created event with ID ${event.joinCode}`);
            } catch (err) {
                console.log(err);
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }
        }


        if (command === "schedule") {
            let creator = registeredUsers.find(o => o.discordId == message.author.id);

            if (!args[0]) {
                message.reply('please supply an event join code.');
                return;
            }

            let event = events.find(o => o.joinCode == args[0].toLowerCase());

            if (!event) {
                message.reply('could not find an event with the supplied join code.');
                return;
            }

            if (event.adminId !== message.author.id) {
                message.reply(`you are not the admin of this event - the admin is ${client.users.get(event.adminId).username}.`);
                return;
            }

            if (!args[1] && !args[2]) {
                message.reply('invalid date and time supplied.');
                return;
            }

            moment.tz.setDefault(creator.timezone);
            let suggestedDateTime = moment.tz(moment(args[2], 'HH:mm').day(args[1]), creator.timezone);
            moment.tz.setDefault();

            if (suggestedDateTime < moment().tz(creator.timezone)) {
                suggestedDateTime.add(7, 'd');
            }

            try {
                res = await db.putEventStartTime(suggestedDateTime.utc().format('YYYY-MM-DD HH:mm'), event.joinCode, creator.discordId);
                await pullEvents();
                message.reply(`set start time of ${event.joinCode} to ${suggestedDateTime.format('YYYY-MM-DD HH:mm')} UTC`);

                event = events.find(o => o.joinCode == args[0].toLowerCase());

                if (event.fireteam.split(',').length === 6 && event.startTime) {
                    message.channel.send(`${event.fireteam.split(',').map(function (elem) { return client.users.get(elem) }).join(" ")} - the event ${event.joinCode} has been filled and will start on ${moment(event.startTime).format('MMMM Do [@] HH:mm z')}.`);
                }

            } catch (err) {
                console.log(err);
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }

        }


        if (command === "fireteam") {
            if (!args[0]) {
                message.reply('please supply an event join code.');
                return;
            }

            let event = events.find(o => o.joinCode == args[0].toLowerCase());

            if (!event) {
                message.reply('could not find an event with the supplied join code.');
                return;
            }

            let messageString = "";

            event.fireteam.split(',').forEach((member, index) => {
                console.log(member);
                messageString += `${client.users.get(member).username}${(member == event.adminId ? " (Admin)" : "")}\n`;
            });

            message.channel.send(`Fireteam for ${event.joinCode}\n\`\`\`\n${messageString}\`\`\``);

        }



        if (command === "join") {
            if (!args[0]) {
                message.reply('please supply an event join code.');
                return;
            }

            let event = events.find(o => o.joinCode == args[0].toLowerCase());
            let user = registeredUsers.find(o => o.discordId == message.author.id);

            if (!user) {
                message.reply('unable to join event - are you registered?');
                return;
            }

            if (!event) {
                message.reply('could not find an event with the supplied join code.');
                return;
            }

            if (event.fireteam.split(',').length >= 6) {
                message.reply('this fireteam is currently full.');
                return;
            }

            if (event.fireteam.split(',').indexOf(message.author.id) != -1) {
                message.reply('you are already a member of this event\'s fireteam.');
                return;
            }

            try {
                await db.putFireteam(user.discordId, event.fireteamId);
                await pullEvents();
                message.reply(`you have joined ${event.joinCode}`);

                event = events.find(o => o.joinCode == args[0].toLowerCase());

                if (event.fireteam.split(',').length == 6 && event.startTime) {
                    message.channel.send(`${event.fireteam.split(',').map(function (elem) { return client.users.get(elem) }).join(" ")} - the event ${event.joinCode} has been filled and will start on ${moment(event.startTime).format('MMMM Do [@] HH:mm z')}.`);
                }

            } catch (err) {
                console.log(err);
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }
        }


        if (command === "leave") {
            if (!args[0]) {
                message.reply('please supply an event join code.');
                return;
            }

            let event = events.find(o => o.joinCode == args[0].toLowerCase());

            if (!event) {
                message.reply('could not find an event with the supplied join code.');
                return;
            }

            if (event.adminId === message.author.id) {
                message.reply('you are the admin of this event - you must elevate another user with the `!admin` command, and then you can leave.');
                return;
            }

            try {
                await db.deleteFireteamMember(message.author.id, event.fireteamId);
                await pullEvents();
                message.reply(`left ${event.joinCode}`);
            } catch (err) {
                console.log(err);
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }
        }


        if (command === "kick") {
            if (!args[0]) {
                message.reply('please supply an event join code.');
                return;
            }

            if (!args[1]) {
                message.reply('please supply a username to kick from the event.');
                return;
            }

            let event = events.find(o => o.joinCode == args[0].toLowerCase());
            let userToKick = client.users.find(user => user.username.toLowerCase() === args[1].toLowerCase()).id;

            if (!event) {
                message.reply('could not find an event with the supplied join code.');
                return;
            }

            if (event.adminId == message.author.id) {
                message.reply(`only admins can kick people from events - please notify ${client.users.get(event.adminId).username} if you require someone to be kicked.`);
                return;
            }

            if (userToKick === message.author.id) {
                message.reply('you cannot kick yourself from an event.');
                return;
            }

            if (event.fireteam.split(',').indexOf(userToKick) > -1) {
                message.reply('the user you are trying to kick is not a member of this event.');
                return;
            }

            try {
                await db.deleteFireteamMember(userToKick, event.fireteamId);
                await pullEvents();
                message.reply(`kicked ${client.users.get(userToKick).username} from ${event.joinCode}.`);
            } catch (err) {
                console.log(err);
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }

        }


        if (command === "admin") {
            if (!args[0]) {
                message.reply('please supply an event join code.');
                return;
            }

            if (!args[1]) {
                message.reply('please supply a username to give admin rights to.');
                return;
            }

            let event = events.find(o => o.joinCode == args[0].toLowerCase());
            let userToMod = client.users.find(user => user.username.toLowerCase() === args[1].toLowerCase()).id;

            if (!event) {
                message.reply('could not find an event with the supplied join code.');
                return;
            }

            if (event.adminId !== message.author.id) {
                message.reply('you must be the admin of this event to elevate another user.');
                return;
            }

            if (event.fireteam.split(',').indexOf(userToMod) < 0) {
                message.reply('the user you are trying to make an admin is not a member of this event.');
                return;
            }

            try {
                await db.putEventAdmin(event.joinCode, userToMod);
                await pullEvents();
                message.reply(`has made ${client.users.get(userToMod).username} the admin of ${event.joinCode}.`);
            } catch (err) {
                console.log(err);
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }

        }


        if (command === "cancel") {
            if (!args[0]) {
                message.reply('please supply an event join code.');
                return;
            }

            let event = events.find(o => o.joinCode == args[0].toLowerCase());

            if (!event) {
                message.reply('could not find an event with the supplied join code.');
                return;
            }

            if (event.adminId !== message.author.id) {
                message.reply(`only admins can cancel events - please notify ${client.users.get(event.adminId).username} to cancel this event.`);
                return;
            }

            try {
                await db.deleteEvent(event.joinCode);
                await db.deleteFireteam(event.fireteamId);
                await pullEvents();
                message.reply(`deleted event ${event.joinCode} and its fireteam.`);
            } catch (err) {
                console.log(err);
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }

        }


        if (command === "finish") {
            if (!args[0]) {
                message.reply('please supply an event join code.');
                return;
            }

            let event = events.find(o => o.joinCode == args[0].toLowerCase());

            if (!event) {
                message.reply('could not find an event with the supplied join code.');
                return;
            }

            if (event.adminId !== message.author.id) {
                message.reply(`only admins can complete events - please notify ${client.users.get(event.adminId).username} to complete this event.`);
                return;
            }

            if (moment(event.startTime).utc() > moment.utc()) {
                message.reply('you cannot finish an event that has not started.');
                return;
            }

            try {
                await db.putEventFinishTime(event.joinCode, moment.utc().format('YYYY-MM-DD HH:mm'));
                await pullEvents();
                await pullHistory();
                message.reply(`marked ${args[0]} as completed with a length of ${moment.duration(moment.utc().diff(event.startTime)).format('H [hours,] mm [minutes]')}.`);
            } catch (err) {
                console.log(err);
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }

        }


        if (["raidreport", "rr"].contains(command)) {
            if (!args[0]) {
                message.reply('please supply an event join code.');
                return;
            }

            let event = await db.getEvent(args[0]);

            if (!event) {
                message.reply('could not find an event with the supplied join code.');
                return;
            }

            if (event.adminId !== message.author.id) {
                message.reply(`only admins can complete events - please notify ${client.users.get(event.adminId).username} to complete this event.`);
                return;
            }

            try {
                await db.putEventRaidReport(event.joinCode, args[1]);
                await pullEvents();
                await pullHistory();
                message.reply(`set the Raid Report link for this event to <${args[1]}>`);
            } catch (err) {
                console.log(err);
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }

        }


        if (command === "next") {
            let creator = registeredUsers.find(o => o.discordId == message.author.id);
            let messageString = "";

            for (let i = 0; i < events.length; i++) {
                messageString += `${events[i].name} - ${(events[i].startTime ? `${moment(events[i].startTime).tz((creator ? creator.timezone : 'UTC')).format('MMMM Do [@] HH:mm z')}` : 'Not Set')} \n!join ${events[i].joinCode} | Length: ${events[i].avgLength} | Power: ${events[i].minPower} | Members: ${events[i].fireteam.split(',').length}/6\n\n`;
            }

            message.channel.send((messageString ? `\`\`\`${messageString.trim()}\`\`\`` : "No events scheduled."));
        }


        if (command === "history") {
            let creator = registeredUsers.find(o => o.discordId == message.author.id);
            let messageString = "";

            for (let i = 0; i < history.length; i++) {
                messageString += `**${history[i].name} (${history[i].joinCode})**\n\t• Started: ${moment(history[i].startTime).tz(creator ? creator.timezone : 'UTC').format('MMMM Do [@] HH:mm z')}\n\t• Raid Report: <${history[i].raidReportUrl}>\n\n`;
            }

            message.channel.send(`Last 3 completed events:\n${messageString.trim()}`);
        }


        if (command === "details") {
            if (args[0]) {
                let requester = registeredUsers.find(o => o.discordId == message.author.id);
                let event = await db.getEvent(args[0]);
                let fireteam = await db.getFireteam(event.fireteamId);

                if (event) {
                    try {
                        message.channel.send(`Details for **${event.joinCode}**:\n\t• ${event.name}${event.raidReportUrl ? ` - <${event.raidReportUrl}>` : ``}\n\t• Start${(event.finishTime ? 'ed' : 'ing')}: ${moment(event.startTime).tz(requester ? requester.timezone : 'UTC').format('MMMM Do [@] HH:mm z')}\n\t${(event.finishTime ? `• Finished: ${moment(event.finishTime).tz(requester ? requester.timezone : 'UTC').format('MMMM Do [@] HH:mm z')}\n\t` : ``)}• Fireteam: ${fireteam.map(function (elem) { return client.users.get(elem.guardianId).username }).join(', ')}`);
                    } catch (err) {
                        console.log(err);
                        message.reply('an error was thrown while trying to run the command - please check the logs.');
                    }
                }

            }
        }

    })
};

client.login(config.token);