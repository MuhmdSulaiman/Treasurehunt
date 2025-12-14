const express = require("express");
const router = express.Router();
const { validationResult ,check } = require('express-validator');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const QRCode = require("qrcode");

const User = require('../models/userModel');
const Trail = require("../models/trailModel");
const Progress = require("../models/playerProgress");


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

// ============================
// ✅ CREATE QR CODE
// ============================


router.post("/generate-qr", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can create trail.' });
    }

    const { levelNumber, place } = req.body;

    if (!levelNumber || !place) {
      return res.status(400).json({
        message: "levelNumber and place are required."
      });
    }

    // 1️⃣ FIND THE LEVEL
    const level = await Trail.findOne({ levelNumber });
    if (!level) {
      return res.status(404).json({
        message: `Level ${levelNumber} not found in database.`
      });
    }

    // 2️⃣ VERIFY PLACE EXISTS
    if (!level.places.includes(place)) {
      return res.status(400).json({
        message: `Place '${place}' does NOT exist in Level ${levelNumber}.`
      });
    }

    // 3️⃣ GENERATE QR WITH FULL JSON
    const qrPayload = JSON.stringify({ levelNumber, place });
    const qrDataURL = await QRCode.toDataURL(qrPayload);

    return res.json({
      message: "QR generated successfully",
      levelNumber,
      place,
      qrCode: qrDataURL
    });

  } catch (error) {
    console.error("QR Generation Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


// ============================
// START GAME
// ============================

router.post("/start-game/:playerId", verifyToken, async (req, res) => {
  try {
    const playerId = req.params.playerId;

    if (!playerId) return res.status(400).json({ message: "playerId is required" });

    // Check if user exists
    const user = await User.findById(playerId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Admin cannot play
    if (user.role === "admin")
      return res.status(403).json({ message: "Admins cannot play the game." });

    // Check if progress already exists for this user
    let progress = await Progress.findOne({ playerId });

    if (progress && !progress.completed) {
      // Resume existing game
      const current = progress.path[progress.placeIndex];
      return res.json({
        message: "Resuming your game...",
        nextTarget: current
          ? {
              levelNumber: current.levelNumber,
              name: current.name,
              image: current.image || null
            }
          : null,
        progressId: progress._id
      });
    }

    // No existing progress → create new game
    const levels = await Trail.find().sort({ levelNumber: 1 });
    if (!levels.length) return res.status(404).json({ message: "No trail levels found" });

    const path = levels.map(level => {
      const randomPlace = level.places[Math.floor(Math.random() * level.places.length)];
      return {
        levelNumber: level.levelNumber,
        name: randomPlace.name || "",
        answer: randomPlace.answer, // stored internally
        image: randomPlace.image || null
      };
    });

    progress = await Progress.create({
      playerId,
      currentLevelNumber: 1,
      path,
      placeIndex: 0,
      startTime: new Date(),
      endTime: null
    });

    return res.json({
      message: "Game Started!",
      nextTarget: {
        levelNumber: path[0].levelNumber,
        name: path[0].name,
        image: path[0].image || null
      },
      progressId: progress._id
    });

  } catch (error) {
    console.error("Start Game Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});




// ============================
// VERIFY QR
// ============================

router.post("/verify-qr/:playerId",verifyToken, async (req, res) => {
  try {
    const playerId = req.params.playerId;  
    const { levelNumber, place } = req.body;  

    if (!levelNumber || !place) {
      return res.status(400).json({
        message: "levelNumber and place are required."
      });
    }

    // Find player progress
    const progress = await Progress.findOne({ playerId });
    if (!progress) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Current target in path
    const currentTarget = progress.path[progress.placeIndex];

    // Validation (level + place)
    if (
      Number(levelNumber) === currentTarget.levelNumber &&
      place === currentTarget.place
    ) {

      // ----------------------------------
      // ⭐ 1. Add time log entry
      // ----------------------------------
      progress.timeLog.push({
        level: currentTarget.levelNumber,
        place: currentTarget.place,
        scannedAt: new Date()
      });

      // ----------------------------------
      // ⭐ 2. Increment placeIndex
      // ----------------------------------
      progress.placeIndex += 1;

      // ----------------------------------
      // ⭐ 3. Update current level for UI
      // ----------------------------------
      progress.currentLevelNumber = progress.placeIndex + 1;

      // ----------------------------------
      // ⭐ 4. If finished all levels
      // ----------------------------------
      if (progress.placeIndex >= progress.path.length) {
        progress.completed = true;
        progress.endTime = new Date();

        await progress.save();

        return res.json({
          message: "🎉 Congratulations! You finished all levels!",
          totalLevels: progress.path.length,
          finalTime: progress.endTime
        });
      }

      // ----------------------------------
      // ⭐ 5. Save progress & return next target
      // ----------------------------------
      await progress.save();

      return res.json({
        message: "Correct! Go to next location!",
        nextTarget: progress.path[progress.placeIndex]
      });
    }

    // If wrong
    return res.status(400).json({
      message: "Wrong place for this level."
    });

  } catch (error) {
    console.error("Verify QR Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});




module.exports = router;

