module.exports = async (fastify, db) => {
  fastify.get('/', async (req, res) => {
    try {
      return res.view('index.ejs',
        {
          'discordData': req.session.get('discordData')
        }
      );
    } catch (err) {
      console.log(err);
      return res.view('/error.ejs',
        {
          'errorMessage': err
        }
      );
    }
  });

  fastify.get('/auth/discord/callback', async (req, res) => {
    try {
  
      const token = await fastify.discordOauth.getAccessTokenFromAuthorizationCodeFlow(req);
  
      const discordApi = async (endpoint, token) => {
        const res = await axios({
          method: 'get',
          url: endpoint,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${token}`
          }
        });
        return res.data;
      }
  
      const discordData = await discordApi('https://discordapp.com/api/users/@me', token.access_token);
      discordData.access_token = token.access_token;
  
      const dbData = await db.users.getByDiscordId(discordData.id);
      if (dbData) {
        discordData.timezone = dbData.timezone;
      } else {
        await db.users.post(discordData.id, 'Etc/UTC');
        discordData.timezone = 'Etc/UTC';
      }
  
      req.session.set('discordData', discordData);
      return res.redirect('/profile');
  
    } catch (err) {
      console.log(err);
      return res.view('/error.ejs',
        {
          'errorMessage': err
        }
      );
    }
  });
  
  fastify.get('/profile', async (req, res) => {
    try {
      if (!req.session.get('discordData')) {
        return res.redirect('/login');
      }
  
      return res.view('profile.ejs',
        {
          'discordData': req.session.get('discordData')
        }
      ); 
    } catch (err) {
      console.log(err);
      return res.view('/error.ejs',
        {
          'errorMessage': err
        }
      );
    }
  });
  
  fastify.get('/events', async (req, res, client) => {
    try {
      if (!req.session.get('discordData')) {
        return res.redirect('/login');
      }
  
      const discordGuilds = await axios({
        method: 'get',
        url: 'https://discordapp.com/api/users/@me/guilds',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${req.session.get('discordData').access_token}`
        }
      });
  
      console.log(discordGuilds);
  
      const sharedGuilds = client.guilds.cache.difference(discordGuilds);
      console.log(sharedGuilds);
  
      return res.view('events.ejs',
        {
          'discordData': req.session.get('discordData'),
          'guilds': discordGuilds.data
        }
      ); 
    } catch (err) {
      console.log(err);
      return res.view('/error.ejs',
        {
          'errorMessage': err
        }
      );
    }
  });
  
  fastify.get('/privacy', async (req, res) => {
    try {
      return res.view('privacy.ejs',
        {
          'discordData': req.session.get('discordData')
        }
      ); 
    } catch (err) {
      console.log(err);
      return res.view('/error.ejs',
        {
          'errorMessage': err
        }
      );
    }
  });
  
  fastify.get('/logout', async (req, res) => {
    try {
      req.session.delete();
      return res.redirect('/');
    } catch (err) {
      console.log(err);
      return res.view('/error.ejs',
        {
          'errorMessage': err
        }
      );
    }
  });
  
  fastify.post('/api/users/timezone', async (req, res) => {
    try {
      const cookieData = req.session.get('discordData');
      const timezone = req.body.timezone;
  
      if (!moment.tz.zone(timezone)) {
        throw new Error(err);
      }
  
      const response = await db.users.putTimezone(cookieData.id, timezone);
      cookieData.timezone = timezone;
      req.session.set('discordData', cookieData);
  
      res.redirect('/profile');
  
    } catch (err) {
      console.log(err);
      return res.view('/error.ejs',
        {
          'errorMessage': err
        }
      );
    }
  });
}