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
}

async function notifyUsers(event) {
    for (let i = 0; i < registeredUsers.length; i++) {
        let user = registeredUsers[i];

        if (!user.newEventNotification) {
            continue;
        }

        if (user.discordId === event.adminId) {
            continue;
        }

        try {
            client.users.get(user.discordId).send(`A new event has been created - **${event.raidId}** (${event.name}${(event.sherpa ? ', Sherpa' : '')}).`);
        } catch (err) {
            console.log(err);
        }
    }
}

function createTimers() {
    for (let i = 0; i < events.length; i++) {
        let eventStart = moment(events[i].startTime);

        if (!events[i].startTime || !eventStart.isAfter(moment.utc())) {
            return;
        }

        let activityData = activities.find(o => o.shortName == events[i].shortName);

        Timer.set(events[i].raidId, () => {
            events[i].fireteam.split(',').forEach((member, index) => {
                let user = registeredUsers.find(o => o.discordId === member)
                client.users.get(member).send(`In 10 minutes you are scheduled to take part in **${events[i].raidId}** (${activityData.name} ${activityData.type}).  In your timezone: ${moment(events[i].startTime).tz(user.timezone).format('MMMM Do [@] HH:mm z')}.  This will take around ${moment.duration(activityData.beginnerEstimate, 'seconds').format("h [hours] mm [minutes]")}.`);
            })
        }, eventStart.clone().subtract(10, "minutes").toDate());

        console.log(`Setting timer with name ${events[i].raidId} set to ping at ${eventStart.clone().subtract(10, "minutes").toDate()}`);
    }
}



client.on("ready", async () => {
    console.log(`Successfully connected to Discord`);
    client.user.setActivity(config.status);
    activities = await db.getActivities();
    registeredUsers = await db.getUsers();
    await pullEvents();
    await pullHistory();
    client.on("message", handleMessage);
});

async function handleMessage(message) {
    if (message.author.bot) return;
    if (message.content.indexOf(config.prefix) !== 0) return;
    message.channel.startTyping();

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
            message.channel.stopTyping();
            return;
        }
        message.channel.send("Your light is lost...");
        client.destroy();
    }


    if (command === "raidinfo") {
        if (!args[0]) {
            message.channel.send(`Available raids: ${activities.map(function (elem) { return elem.shortName }).join(", ")}.`);
            message.channel.stopTyping();
            return;
        }

        let event = activities.find(o => o.shortName == args[0].toLowerCase());

        if (!event) {
            message.channel.send(`Couldn't find an event with raidId ${args[0]}`);
            message.channel.stopTyping();
            return;
        }

        let embed = new Discord.RichEmbed()
            .setTitle(`${event.name} (${event.type})`)
            .setColor(5517157)
            .setDescription(`*"${event.tagline}"*\n${event.description}\n\`\`\`Short code: ${event.shortName}\nRecommended power: ${event.recommendedPower}\nBeginner estimate: ${moment().startOf('day').seconds(event.beginnerEstimate).format('H:mm')}\n\`\`\``)
            .setURL(`${event.wikiUrl}`)
            .setThumbnail(`https://gamezone.cool/img/${event.shortName}.png`)
            .setFooter(`Gather your Fireteam - !make ${event.shortName}`)

        message.channel.send(embed);
    }


    if (command === "register") {
        let user = registeredUsers.find(o => o.discordId == message.author.id);

        if (!user) {
            message.reply('you appear to already be registered - do `!userinfo` to view your current details.');
            message.channel.stopTyping();
            return;
        }

        if (!args[0] || !args[0].includes('#')) {
            message.reply(`invalid Battle.Net ID supplied - please ensure you are using your full BNet ID, including the # dsicriminator.`);
            message.channel.stopTyping();
            return;
        }

        if (!args[1] || !moment.tz.zone(args[1])) {
            message.reply(`invalid timezone supplied - for a list of acceptable timezones, do \`!timezone help\`.`);
            message.channel.stopTyping();
            return;
        }

        let response = await google.getFiles(message.author.id);
        let bnetId = args[0];
        let timezone = args[1];
        let discordId = message.author.id;

        if (response.data.files.length) {
            message.reply(`you already have a schedule spreadsheet - registration has not completed, please contact an admin.`);
            message.channel.stopTyping();
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
            message.react("✅");
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }
    }



    if (["tz", "timezone"].includes(command)) {
        if (args[0] === 'help') {
            message.channel.send('You can find the list of acceptable timezones here: <https://github.com/MacND/the-oracle-engine/blob/master/timezones.json>');
            message.channel.stopTyping();
            return;
        }

        let user = registeredUsers.find(o => o.discordId == message.author.id);

        if (!user) {
            message.reply('you don\'t appear to be registered - please register first.');
            message.channel.stopTyping();
            return;
        }

        if (!moment.tz.zone(args[0])) {
            message.channel.send('Invalid timezone supplied.');
            message.channel.stopTyping();
            return;
        }

        if (args[0] === user.timezone) {
            message.channel.send(`Your timezone is already set to ${args[0]}`);
            message.channel.stopTyping();
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


    if (["bnet", "battlenet"].includes(command)) {
        let user = registeredUsers.find(o => o.discordId === message.author.id);
        let bnet = args[0]

        if (!user) {
            message.channel.send('Unable to find user - have you registered?');
            message.channel.stopTyping();
            return;
        }

        if (!bnet.includes('#')) {
            message.channel.send('Invalid BNet ID supplied');
            message.channel.stopTyping();
            return;
        }

        if (bnet === user.bnetId) {
            message.channel.send(`Your BNet ID is already set to ${bnet}`);
            message.channel.stopTyping();
            return;
        }

        await db.putUserBnet(bnet, message.author.id);
        registeredUsers = await db.getUsers();

    }


    if (command === "twitch") {
        if (!args[0]) {
            message.reply('please provide your Twitch username.');
            message.channel.stopTyping();
            return;
        }

        let twitch = args[0];
        let user = registeredUsers.find(o => o.discordId == message.author.id);

        if (!user) {
            message.channel.send('Unable to find user - have you registered?');
            message.channel.stopTyping();
            return;
        }

        if (twitch.includes(':', '/', '.')) {
            message.reply('invalid Twitch username supplied - did you provide a link instead?');
            message.channel.stopTyping();
            return;
        }

        if (twitch === user.twitch) {
            message.reply(`your Twitch username is already set to ${user.twitch}.`);
            message.channel.stopTyping();
            return;
        }

        try {
            await db.putUserTwitch(message.author.id, twitch);
            registeredUsers = await db.getUsers();
            message.react("✅");
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }

    }


    if (command === "notify") {
        let notify;
        let user = registeredUsers.find(o => o.discordId == message.author.id);

        if (!user) {
            message.channel.send('Unable to find user - have you registered?');
            message.channel.stopTyping();
            return;
        }

        if (!args[0]) {
            message.reply(`please provide either 'on' or 'off'.`);
            message.channel.stopTyping();
            return;
        }

        if (args[0] === 'on') {
            notify = true;
        } else if (args[0] === 'off') {
            notify = false;
        } else {
            message.reply(`invalid arguments supplied - provide either 'on' or 'off'.`);
            message.channel.stopTyping();
            return;
        }

        try {
            await db.putUserNotification(message.author.id, notify);
            registeredUsers = await db.getUsers();
            message.react("✅");
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }

    }


    if (command === "userinfo") {
        let searchUserId = (args[0] ? client.users.find(user => user.username.toLowerCase() === args[0].toLowerCase()).id : message.author.id);
        let user = registeredUsers.find(o => o.discordId === searchUserId);

        if (!user) {
            message.channel.send(`${client.users.get(searchUserId).username} is not registered.`);
            message.channel.stopTyping();
            return;
        }

        message.channel.send(`User information for ${client.users.get(searchUserId).username}:\`\`\`BNet ID: ${user.bnetId}\nTimezone: ${user.timezone}\nTwitch: ${(user.twitch ? user.twitch : 'Not set')}\nNotifications: ${(user.newEventNotification ? 'On' : 'Off')}\`\`\``);

    }


    if (command === "sheet") {
        let user = registeredUsers.find(o => o.discordId === message.author.id);

        if (!user) {
            message.reply('unable to find user - have you registered?');
            message.channel.stopTyping();
            return;
        }

        try {
            client.users.get(user.discordId).send(`Your GSheet can be found at https://docs.google.com/spreadsheets/d/${user.gsheeturl}`);
            message.react("✅");
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.react("⚠️");
        }
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
            message.channel.send(`Please supply an event raidId.`);
            message.channel.stopTyping();
            return;
        }

        let activity = activities.find(o => o.shortName == args[0].toLowerCase());

        if (!activity) {
            message.channel.send(`Unable to find an event with raidId ${args[0]}.`);
            message.channel.stopTyping();
            return;
        }

        try {
            let res = await db.postEvent(activity.shortName, message.author.id, moment.utc().format('YYYY-MM-DD HH:mm'));
            await pullEvents();
            let event = events.find(o => o.id == res[1].insertId);
            await notifyUsers(event);
            message.reply(`created event with ID ${event.raidId}`);
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }
    }


    if (command === "sherpa") {
        if (!args[0]) {
            message.reply(`please supply an event raidId.`);
            message.channel.stopTyping();
            return;
        }

        let event = events.find(o => o.raidId == args[0].toLowerCase());

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        if (event.adminId !== message.author.id) {
            message.reply(`you are not the admin of this event - the admin is ${client.users.get(event.adminId).username}.`);
            message.channel.stopTyping();
            return;
        }

        try {
            await db.putSherpa(event.raidId, event.adminId);
            await pullEvents();
            message.react("✅");
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }

    }


    if (command === "schedule") {
        let creator = registeredUsers.find(o => o.discordId == message.author.id);

        if (!args[0]) {
            message.reply('please supply an event raidId.');
            message.channel.stopTyping();
            return;
        }

        let event = events.find(o => o.raidId == args[0].toLowerCase());

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        if (event.adminId !== message.author.id) {
            message.reply(`you are not the admin of this event - the admin is ${client.users.get(event.adminId).username}.`);
            message.channel.stopTyping();
            return;
        }

        if (!args[1] && !args[2]) {
            message.reply('invalid date and time supplied.');
            message.channel.stopTyping();
            return;
        }

        moment.tz.setDefault(creator.timezone);
        let suggestedDateTime = moment.tz(moment(args[2], 'HH:mm').day(args[1]), creator.timezone);
        moment.tz.setDefault();

        if (suggestedDateTime < moment().tz(creator.timezone)) {
            suggestedDateTime.add(7, 'd');
        }

        try {
            res = await db.putEventStartTime(suggestedDateTime.utc().format('YYYY-MM-DD HH:mm'), event.raidId, creator.discordId);
            await pullEvents();
            message.reply(`set start time of ${event.raidId} to ${suggestedDateTime.format('YYYY-MM-DD HH:mm')} UTC`);

            event = events.find(o => o.raidId == args[0].toLowerCase());

            if (event.fireteam.split(',').length === 6 && event.startTime) {
                message.channel.send(`${event.fireteam.split(',').map(function (elem) { return client.users.get(elem) }).join(" ")} - the event ${event.raidId} has been filled and will start on ${moment(event.startTime).format('MMMM Do [@] HH:mm')} UTC`);
            }

        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }

    }


    if (command === "unschedule") {
        let creator = registeredUsers.find(o => o.discordId == message.author.id);

        if (!args[0]) {
            message.reply('please supply an event raidId.');
            message.channel.stopTyping();
            return;
        }

        let event = events.find(o => o.raidId == args[0].toLowerCase());

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        if (!event.startTime) {
            message.reply(`this event has not yet been scheduled.`);
            message.channel.stopTyping();
            return;
        }

        if (event.adminId !== message.author.id) {
            message.reply(`you are not the admin of this event - the admin is ${client.users.get(event.adminId).username}.`);
            message.channel.stopTyping();
            return;
        }

        try {
            await db.deleteEventStartTime(event.raidId);
            await pullEvents();
            message.react("✅");

        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }
    }


    if (command === "fireteam") {
        if (!args[0]) {
            message.reply('please supply an event raidId.');
            message.channel.stopTyping();
            return;
        }

        let event = events.find(o => o.raidId == args[0].toLowerCase());

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        let messageString = "";

        event.fireteam.split(',').forEach((member, index) => {
            console.log(member);
            messageString += `${client.users.get(member).username}${(member == event.adminId ? " (Admin)" : "")}\n`;
        });

        message.channel.send(`Fireteam for ${event.raidId}\n\`\`\`\n${messageString}\`\`\``);

    }



    if (command === "join") {
        if (!args[0]) {
            message.reply('please supply an event raidId.');
            message.channel.stopTyping();
            return;
        }

        let event = events.find(o => o.raidId == args[0].toLowerCase());
        let user = registeredUsers.find(o => o.discordId == message.author.id);

        if (!user) {
            message.reply('unable to join event - are you registered?');
            message.channel.stopTyping();
            return;
        }

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        if (event.fireteam.split(',').length >= 6) {
            message.reply('this fireteam is currently full.');
            message.channel.stopTyping();
            return;
        }

        if (event.fireteam.split(',').indexOf(message.author.id) != -1) {
            message.reply('you are already a member of this event\'s fireteam.');
            message.channel.stopTyping();
            return;
        }

        try {
            await db.putFireteam(user.discordId, event.fireteamId);
            await pullEvents();
            message.react("✅");

            event = events.find(o => o.raidId == args[0].toLowerCase());

            if (event.fireteam.split(',').length == 6 && event.startTime) {
                message.channel.send(`${event.fireteam.split(',').map(function (elem) { return client.users.get(elem) }).join(" ")} - the event ${event.raidId} has been filled and will start on ${moment(event.startTime).format('MMMM Do [@] HH:mm z')}.`);
            }

        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }
    }


    if (command === "leave") {
        if (!args[0]) {
            message.reply('please supply an event raidId.');
            message.channel.stopTyping();
            return;
        }

        let event = events.find(o => o.raidId == args[0].toLowerCase());

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        if (event.adminId === message.author.id) {
            message.reply('you are the admin of this event - you must elevate another user with the `!admin` command, and then you can leave.');
            message.channel.stopTyping();
            return;
        }

        try {
            await db.deleteFireteamMember(message.author.id, event.fireteamId);
            await pullEvents();
            message.react("✅");
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }
    }


    if (command === "kick") {
        if (!args[0]) {
            message.reply('please supply an event raidId.');
            message.channel.stopTyping();
            return;
        }

        if (!args[1]) {
            message.reply('please supply a username to kick from the event.');
            message.channel.stopTyping();
            return;
        }

        let event = events.find(o => o.raidId == args[0].toLowerCase());
        let userToKick = client.users.find(user => user.username.toLowerCase() === args[1].toLowerCase()).id;

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        if (event.adminId !== message.author.id) {
            message.reply(`only admins can kick people from events - please notify ${client.users.get(event.adminId).username} if you require someone to be kicked.`);
            message.channel.stopTyping();
            return;
        }

        if (userToKick === message.author.id) {
            message.reply('you cannot kick yourself from an event.');
            message.channel.stopTyping();
            return;
        }

        if (!event.fireteam.split(',').includes(userToKick)) {
            message.reply('the user you are trying to kick is not a member of this event.');
            message.channel.stopTyping();
            return;
        }

        try {
            await db.deleteFireteamMember(userToKick, event.fireteamId);
            await pullEvents();
            message.react("✅");
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }

    }


    if (command === "admin") {
        if (!args[0]) {
            message.reply('please supply an event raidId.');
            message.channel.stopTyping();
            return;
        }

        if (!args[1]) {
            message.reply('please supply a username to give admin rights to.');
            message.channel.stopTyping();
            return;
        }

        let event = events.find(o => o.raidId == args[0].toLowerCase());
        let userToMod = client.users.find(user => user.username.toLowerCase() === args[1].toLowerCase()).id;

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        if (event.adminId !== message.author.id) {
            message.reply('you must be the admin of this event to elevate another user.');
            message.channel.stopTyping();
            return;
        }

        if (event.fireteam.split(',').indexOf(userToMod) < 0) {
            message.reply('the user you are trying to make an admin is not a member of this event.');
            message.channel.stopTyping();
            return;
        }

        try {
            await db.putEventAdmin(event.raidId, userToMod);
            await pullEvents();
            message.react("✅");
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }

    }


    if (command === "cancel") {
        if (!args[0]) {
            message.reply('please supply an event raidId.');
            message.channel.stopTyping();
            return;
        }

        let event = events.find(o => o.raidId == args[0].toLowerCase());

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        if (event.adminId !== message.author.id) {
            message.reply(`only admins can cancel events - please notify ${client.users.get(event.adminId).username} to cancel this event.`);
            message.channel.stopTyping();
            return;
        }

        try {
            await db.deleteEvent(event.raidId);
            await db.deleteFireteam(event.fireteamId);
            await pullEvents();
            message.react("✅");
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }

    }


    if (command === "finish") {
        if (!args[0]) {
            message.reply('please supply an event raidId.');
            message.channel.stopTyping();
            return;
        }

        let event = events.find(o => o.raidId == args[0].toLowerCase());

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        if (event.adminId !== message.author.id) {
            message.reply(`only admins can complete events - please notify ${client.users.get(event.adminId).username} to complete this event.`);
            message.channel.stopTyping();
            return;
        }

        if (moment(event.startTime).utc() > moment.utc()) {
            message.reply('you cannot finish an event that has not started.');
            message.channel.stopTyping();
            return;
        }

        try {
            await db.putEventFinishTime(event.raidId, moment.utc().format('YYYY-MM-DD HH:mm'));
            await pullEvents();
            await pullHistory();
            message.reply(`marked ${args[0]} as completed with a length of ${moment.duration(moment.utc().diff(event.startTime)).format('H [hours,] mm [minutes]')}.`);
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }

    }


    if (["raidreport", "rr"].includes(command)) {
        if (!args[0]) {
            message.reply('please supply an event raidId.');
            message.channel.stopTyping();
            return;
        }

        let event = await db.getEvent(args[0]);

        if (!event) {
            message.reply('could not find an event with the supplied raidId.');
            message.channel.stopTyping();
            return;
        }

        if (event.adminId !== message.author.id) {
            message.reply(`only admins can complete events - please notify ${client.users.get(event.adminId).username} to complete this event.`);
            message.channel.stopTyping();
            return;
        }

        try {
            await db.putEventRaidReport(event.raidId, args[1]);
            await pullEvents();
            await pullHistory();
            message.react("✅");
        } catch (err) {
            console.log(err);
            message.channel.stopTyping();
            message.reply('an error was thrown while trying to run the command - please check the logs.');
        }

    }


    if (command === "next") {
        let creator = registeredUsers.find(o => o.discordId == message.author.id);
        let messageString = "";

        for (let i = 0; i < events.length; i++) {
            let event = events[i];
            messageString += `**${event.name}${(event.sherpa ? ` Sherpa` : ``)} (${event.raidId})**\n\`\`\`• Starting: ${(event.startTime ? `${moment(event.startTime).tz((creator ? creator.timezone : 'UTC')).format('MMMM Do [@] HH:mm z')}` : 'Not Set')}\n• Fireteam: ${event.fireteam.split(',').length}/6${event.fireteam.split(',').length !== 6 ? `  | !join ${event.raidId}` : ``}\n• Estimate: ${(event.sherpa ? event.beginnerEstimate : event.experiencedEstimate)} | Power: ${event.recommendedPower}\`\`\`\n`;
        }

        message.channel.send((messageString ? `Upcoming events:\n${messageString.trim()}` : "No events scheduled."));
    }


    if (command === "history") {
        let creator = registeredUsers.find(o => o.discordId == message.author.id);
        let messageString = "";

        for (let i = 0; i < history.length; i++) {
            let event = history[i];
            messageString += `**${event.name}${(event.sherpa ? ` Sherpa` : ``)} (${event.raidId})**\n• Started: ${moment(event.startTime).tz(creator ? creator.timezone : 'UTC').format('MMMM Do [@] HH:mm z')}\n• Raid Report: <${event.raidReportUrl}>\n\n`;
        }

        message.channel.send(`Last 3 completed events:\n${messageString.trim()}`);
    }


    if (command === "details") {
        if (!args[0]) {
            message.reply('please supply a raidId.');
            message.channel.stopTyping();
            return;
        }

        let requester = registeredUsers.find(o => o.discordId == message.author.id);
        let event = await db.getEvent(args[0]);
        let fireteam = await db.getFireteam(event.fireteamId);

        if (event) {
            try {
                message.channel.send(`Details for **${event.raidId}**:\n\t• ${event.name}${event.raidReportUrl ? ` - <${event.raidReportUrl}>` : ``}\n\t• Start${(event.finishTime ? 'ed' : 'ing')}: ${moment(event.startTime).tz(requester ? requester.timezone : 'UTC').format('MMMM Do [@] HH:mm z')}\n\t${(event.finishTime ? `• Finished: ${moment(event.finishTime).tz(requester ? requester.timezone : 'UTC').format('MMMM Do [@] HH:mm z')}\n\t` : ``)}• Fireteam: ${fireteam.map(function (elem) { return client.users.get(elem.discordId).username }).join(', ')}`);
            } catch (err) {
                console.log(err);
                message.channel.stopTyping();
                message.reply('an error was thrown while trying to run the command - please check the logs.');
            }
        }

    }

    message.channel.stopTyping();

};

client.login(config.token);