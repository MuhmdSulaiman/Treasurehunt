const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
  playerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true
  },

  path: [
    {
      levelNumber: Number,
      place: String
    }
  ],

  placeIndex: { 
    type: Number, 
    default: 0 
  },

  currentLevelNumber: { 
    type: Number, 
    default: 1 
  },

  // 🕒 Game start time
  startTime: { 
    type: Date, 
    default: Date.now 
  },

  // 🏁 Game end time (null until game finishes)
  endTime: { 
    type: Date, 
    default: null 
  },

  // Optional: Time logs for each checkpoint
  timeLog: [
    {
      level: Number,
      place: String,
      scannedAt: { type: Date },
      timeTakenMs: Number
    }
  ]
});

module.exports = mongoose.model("Progress", progressSchema);


















