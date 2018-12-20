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

jwtClient.authorize((err, tokens) => {
    if (err) {
        console.log(err);
        return;
    } else {
        console.log("Successfully connected to Google API");
    }
});


module.exports = {
    getFiles: async function (fileName) {
        try {
            let response = await drive.files.list({
                auth: jwtClient,
                q: `name = '${fileName}' AND '${config.driveFolderId}' in parents`
            });
            return response.data;
        } catch (err) {
            throw new Error(err);
        }
    },

    createTimetable: async function (fileName) {
        try {
            let response = await drive.files.copy({
                auth: jwtClient,
                fileId: config.templateFileId,
                resource: {
                    "name": fileName
                }
            });
            return response.data;
        } catch (err) {
            throw new Error(err);
        }
    },

    shareTiemtable: async function (fileId) {
        try {
            let response = await drive.permissions.create({
                auth: jwtClient,
                fileId: newFileId,
                resource: {
                    'role': 'writer',
                    'type': 'anyone'
                }
            });
            return response.data;
        } catch (err) {
            throw new Error(err)
        }
    }
}