module.exports = {
  run: async (client, message, args) => {
  try {
    //zDBversion
    let tablename = 'zDBversion';
    let requiredversion = await client.db.zDBversion.getRequiredTableVersion();
    let exists = await client.db.zDBversion.exists();
    
    if(!exists) {
      let createsuccess = client.db.zDBversion_refresh.create();
      if(createsuccess) {
        message.reply(`Created table ${tablename}`);
      } else {
        message.reply(`${tablename} is missing but could not be created`)
      }
    }

    let existsversioninfo = await client.db.zDBversion.existsversioninfo();

    if(!existsversioninfo) {
      message.reply(`Could not find version info for table ${tablename}`);
    }

     if(existsversioninfo) {
      let currentversion = await client.db.zDBversion.getCurrentVersionByName(tablename);
    }

    if(existsversioninfo && (currentversion == requiredversion)) {
      message.reply(`${tablename} is present and up to date.`);
    }// else {
     // let updatesuccess = await client.db.zDBversion_refresh.update(tablename);
     //}

    //others...
    //let tablename = 'someothertable'
    //etc...

    return message.reply('Finished database refresh.');

  } catch (err) {
      throw new Error(err);
    }
  },
  help: 'Checks database compatibility and updates if needed.  Compares version info from each data access module against version info in database itself. Creates missing tables or updates existing tables to latest version.'
};