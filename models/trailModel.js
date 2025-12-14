const mongoose = require('mongoose');

const trailSchema = new mongoose.Schema({
  levelNumber: {
    type: Number,
    required: true,
    unique: true,   // ⭐ only one doc per level
    min: 1,
    max: 5
  },
  places: {
    type: [String],
    default: [],
    validate: {
      validator: (arr) => arr.length <= 4,
      message: "Each level can have max 4 places"
    }
  }
});

module.exports = mongoose.model("Trail", trailSchema);
