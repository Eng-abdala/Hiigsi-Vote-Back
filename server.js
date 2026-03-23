const express = require('express');     
const mongoose = require('mongoose');
const app = require('./app');

mongoose.connect('mongodb+srv://abdul482561_db_user:t4zTRM0Y5f0DBWy8@hiigsi.pbnv9om.mongodb.net/?appName=Hiigsi', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});