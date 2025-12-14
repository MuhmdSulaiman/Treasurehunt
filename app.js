var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const db = require('./public/database/db');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/trail');
var playerRouter = require('./routes/player');

const cors = require('cors');
const session = require('express-session');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// CORS setup
app.use(cors({
  origin: 'http://localhost:3000',
  methods: 'GET,POST,PUT,DELETE',
  credentials: true,
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/booking_receipts', express.static('booking_receipts'));

app.use((req, res, next) => {
  req.io = app.get('io'); // ✅ Get the io instance set in www.js
  next();
});


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/player', playerRouter);
app.use("/uploads", express.static("uploads"));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Export the app for use in www.js
module.exports = app;
