module.exports = {
  run: async (client, message, args) => {
  try {
    /* 
      Code in this function has access to the Discord client,
      the original message object, the arguments provided.

      You can also access the database pool via client.dbpool.
    */
  } catch (err) {
      throw new Error(err);
    }
  },

  /*
    All command modules must export a help property, and PRs for
    new commands without this will be rejected.
  */
  help: 'Checks database compatibility and updates if needed.  Compares version info from each data access module against version info in database itself. Creates missing tables or updates existing tables to latest version.'
};