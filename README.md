# notarius-to-the-emperor
A Discord.js bot to help with arranging raids and get D2 character stats inside Discord.

Shamelessly developed using [eslachance's Gist](https://gist.github.com/eslachance/3349734a98d30011bb202f47342601d3) as a starting point.

## The Plan™
### Registering
> !register BNet#12345 'Europe/Edinburgh' user@example.com
1) Users will have to register their Battle.Net account because either Discord or Blizzard won't fix their shit
2) Users will register their timezone for activity scheduling (Moment.js timezone handling e.g. 'America/Los_Angeles')
3) User can register their Google account email address to enable Calendar invitations
4) BNet account and Guardian info will then be stored in the database

### Scheduling
> !suggest "Eater of Worlds" Saturday 7PM  
> `Event created: Eater of Worlds Raid Lair, scheduled for 7PM BST on January 6th 2018.  Short code is eow1900jan6.`  
> !join eow1900jan6  
> `User (BNet#12345) joined eow1900jan6 with their default Guardian.`  
1) Suggested event is written to db, with creator's default Guardian automatically assigned one of the 6 fireteam slots
2) Other users can then join the event using the short ID, and can specify their guardian of choice; otherwise, it will use the default.
3) Event will then be pushed to a public Google Calendar - if a user registers their Google account info, they will be invited to the event.
# the-oracle-engine
