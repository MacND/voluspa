const express = require('express');
const path = require('path');

const app = express();

app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(443, () => {
  console.info('Running on port 443');
});

// Routes
app.use('/discord', require('./discord'));

app.use((err, req, res, next) => {
  switch (err.message) {
  case 'NoCodeProvided':
    return res.status(400).send({
      status: 'ERROR',
      error: err.message,
    });
  default:
    return res.status(500).send({
      status: 'ERROR',
      error: err.message,
    });
  }
});