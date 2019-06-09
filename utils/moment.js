const moment = require('moment-timezone');
const momentDurationFormatSetup = require("moment-duration-format");
momentDurationFormatSetup(moment);
typeof moment.duration.fn.format === "function";
typeof moment.duration.format === "function";
moment.locale('en-gb');

module.exports = moment;