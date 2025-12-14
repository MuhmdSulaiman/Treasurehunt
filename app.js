var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

require("dotenv").config();

const cors = require("cors");
const session = require("express-session");

const db = require("./public/database/db");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/trail");
var playerRouter = require("./routes/player");

var app = express();

/* ================================
   ✅ CORS — MUST BE FIRST
================================ */
app.use(
  cors({
    origin: true, // allow all origins (Render + localhost)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Handle preflight requests
app.options("*", cors());

/* ================================
   VIEW ENGINE
================================ */
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

/* ================================
   SESSION (not blocking CORS)
================================ */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

/* ================================
   MIDDLEWARES
================================ */
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/booking_receipts", express.static("booking_receipts"));
app.use("/uploads", express.static("uploads"));

/* ================================
   SOCKET.IO HELPER
================================ */
app.use((req, res, next) => {
  req.io = app.get("io");
  next();
});

/* ================================
   ROUTES
================================ */
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/player", playerRouter);

/* ================================
   404 HANDLER
================================ */
app.use(function (req, res, next) {
  next(createError(404));
});

/* ================================
   ERROR HANDLER
================================ */
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message || "Server Error",
  });
});

module.exports = app;
