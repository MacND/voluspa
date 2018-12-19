const { google } = require('googleapis');
const drive = google.drive('v3');
const sheets = google.sheets('v4');
const config = require('./config.json');

const jwtClient = new google.auth.JWT(
    config.client_email,
    null,
    config.private_key,
    ['https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive']
);
