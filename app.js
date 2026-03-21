const express = require('express');
const cors = require('cors');

const authRoute = require('./auth/authRoute');
const adminRoute = require('./routes/adminRoute');
const studentRoute = require('./routes/studentRoute');
const electionRoute = require('./routes/electionRoute');
const voteRoute = require('./routes/voteRoute');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/auth', authRoute);
app.use('/api/admins', adminRoute);
app.use('/api/students', studentRoute);
app.use('/api/elections', electionRoute);
app.use('/api/votes', voteRoute);

module.exports = app;
