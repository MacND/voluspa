async function setNewTimezone(timezone) {
  const res = await axios({
    method: 'post',
    url: '/api/users/timezone',
    data: {
      timezone: timezone
    }
  });
  location.reload();
}

function changeTimezoneSubhead() {
  document.getElementById('timezone-subhead').innerHTML = "Updating...";
}

const selectorTimezones = []
selectorTimezones.push("<option value=\"\"></option>");
moment.tz.names().forEach(e => {
  selectorTimezones.push(`<option value=${e}>${e}</option>`);
});

document.querySelector('.timezone-selector').innerHTML = selectorTimezones;
$(document).ready(function () {
  $('select').selectize({
    sortField: 'text'
  });
});