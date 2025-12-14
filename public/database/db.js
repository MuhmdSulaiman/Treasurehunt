const mongoose = require('mongoose');
require('dotenv').config();  // load .env

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', (error) => console.error('MongoDB connection error:', error));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

module.exports = db;
