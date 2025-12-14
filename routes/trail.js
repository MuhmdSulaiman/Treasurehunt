const express = require("express");
const router = express.Router();
const Trail = require("../models/trailModel");
// const Progress = require("../models/playerProgress");
const { validationResult ,check } = require('express-validator');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');


// ============================
// 🔐 VERIFY TOKEN MIDDLEWARE
// ============================
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) return res.status(404).json({ message: 'User not found.' });

    req.user = { id: user._id, role: user.role };
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};




//CRUD

// ============================
// ✅ CREATE A TRAIL
// ============================
// CREATE or UPDATE TRAIL (Unified Route)
router.post("/trailCreate",verifyToken, async (req, res) => {
  try { 
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can create trail.' });
    }
    const { levelNumber, place } = req.body;

    if (!levelNumber || !place) {
      return res.status(400).json({ message: "levelNumber and place are required." });
    }

    if (levelNumber < 1 || levelNumber > 5) {
      return res.status(400).json({ message: "Level number must be between 1 and 5." });
    }

    // 🔍 Find if level exists
    let level = await Trail.findOne({ levelNumber });

    // 🆕 If level doesn't exist, create it
    if (!level) {
      level = new Trail({
        levelNumber,
        places: []
      });
    }

    // ❌ Restrict max 4 places
    if (level.places.length >= 4) {
      return res.status(400).json({
        message: `Level ${levelNumber} already has 4 places.`,
        currentPlaces: level.places
      });
    }

    // ➕ Add new place
    level.places.push(place);

    // 💾 Save document
    await level.save();

    res.status(200).json({
      message: `Place '${place}' added to Level ${levelNumber}.`,
      level
    });

  } catch (error) {
    console.error("Add Place Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


// ============================
// ✅ RETRIEVE ALL TRAIL
// ============================
router.get("/trail", verifyToken, async (req, res) => {
  try {
     if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can retrieve trail.' });
    }
    const levels = await Trail.find().sort({ levelNumber: 1 });

    res.status(200).json({
      message: "All levels retrieved",
      levels
    });

  } catch (error) {
    console.error("Retrieve Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});
// =================================
// ✅ RETRIEVE Level by levelNumber
// =================================
router.get("/trail/:levelNumber", verifyToken,async (req, res) => {
  try {
     if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can retrieve trail.' });
    }
    const level = await Trail.findOne({ levelNumber: req.params.levelNumber });

    if (!level) {
      return res.status(404).json({ message: "Level not found" });
    }

    res.status(200).json({
      message: "Level retrieved successfully",
      level
    });

  } catch (error) {
    console.error("Retrieve ID Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// =================================
// ✅ UPDATE Level by levelNumber
// =================================

router.put("/trail/:levelNumber",verifyToken, async (req, res) => {
  try {
     if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can update trail.' });
    }
    const { index, newPlace } = req.body;
    const levelNumber = req.params.levelNumber;

    if (index === undefined || !newPlace) {
      return res.status(400).json({
        message: "You must send index and newPlace."
      });
    }

    let level = await Trail.findOne({ levelNumber });

    if (!level) {
      return res.status(404).json({ message: "Level not found" });
    }

    if (index < 0 || index >= level.places.length) {
      return res.status(400).json({
        message: `Invalid index. Level ${levelNumber} has ${level.places.length} places.`
      });
    }

    // 🔄 Replace specific place
    level.places[index] = newPlace;

    await level.save();

    res.status(200).json({
      message: `Place at index ${index} updated successfully`,
      level
    });

  } catch (error) {
    console.error("Update Place Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// =================================
// ✅ DELETE Level by levelNumber
// =================================

router.delete("/trail/:levelNumber",verifyToken, async (req, res) => {
  try {
     if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can delete trail.' });
    }
    const result = await Trail.findOneAndDelete({
      levelNumber: req.params.levelNumber
    });

    if (!result) {
      return res.status(404).json({ message: "Level not found" });
    }

    res.status(200).json({
      message: `Level ${req.params.levelNumber} deleted successfully`
    });

  } catch (error) {
    console.error("Delete Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;
