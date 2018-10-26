const Discord = require("discord.js");
const client = new Discord.Client({ disableEveryone: true });

const config = require("./config.json");

const Maria = require("mariasql");
const sqlClient = new Maria({
    host: config.dbhost,
    user: config.dbuser,
    password: config.dbpass,
    db: config.dbname
});

const moment = require('moment');
const momenttz = require('moment-timezone');
const timezones = require('./timezones.json');

client.on("ready", async () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setActivity(config.status);
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

    if (command === "die") {
        message.channel.send("Your light is lost...");
        client.destroy();
    }

    if (command === "eventinfo" && args[0]) {
        sqlClient.query('SELECT * FROM events WHERE shortCode = :shortCode;', { shortCode: args[0] }, function (err, rows) {
            if (err)
                throw (err);

            const embed = new Discord.RichEmbed()
                .setTitle(`${rows[0].name} (${rows[0].eventType})`)
                .setColor(5517157)
                .setDescription(`\"*${rows[0].eventTagline}*\"\n${rows[0].eventDescription}\n\`\`\`Short code: ${rows[0].shortCode}\nRecommended power: ${rows[0].minPower}\nAverage length: ${moment().startOf('day').seconds(rows[0].avgLength).format('H:mm')}\n\`\`\``)
                .setURL(`${rows[0].wikiLink}`)
                .setThumbnail(`https://gamezone.cool/img/${rows[0].shortCode}.png`)
                .setFooter(`Gather your Fireteam - !suggest ${rows[0].shortCode}`)
            message.channel.send({ embed });
        });
        sqlClient.end();
    }

    if (command === "register") {
        if (args[0] && args[1] && message.channel.id === '494459395888119809') {
            if ((args[0]).includes('#') && momenttz.tz.zone(args[1])) {
                let bnetId = args[0];
                let timezone = args[1];
                let discordId = (message.author.id);

                sqlClient.query('INSERT IGNORE INTO users VALUES (:discordId, :bnetId, :timezone);', { discordId: discordId, bnetId: args[0], timezone: args[1] }, function (err, rows) {
                    if (err)
                        throw (err);
                    console.log(rows);
                    if (rows.info.affectedRows === '0') {
                        message.channel.send(`${message.author} you have already registered.`);
                    } else {
                        message.channel.send(`${message.author} registered BNet tag ${bnetId} with timezone ${timezone}`);
                    }
                });
                sqlClient.end();
            } else {
                message.channel.send(`${message.author} malformed input - please ensure you are using your full BNet ID (including #) and a valid timezone.`);
            }
        } else {
            message.channel.send(`${message.author} please specify both your BNet ID and Timezone`);
        }
    }

    if (command === "timezone") {
        if (args[0] === 'help') {
            message.author.send('You can find the list of acceptable timezones here: https://github.com/MacND/the-oracle-engine/blob/master/timezones.json');
        }
    }

});

client.login(config.token);