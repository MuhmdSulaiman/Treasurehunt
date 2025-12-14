require('dotenv').config();
var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Progress = require("../models/playerProgress");

const User = require('../models/userModel');
const { validationResult ,check } = require('express-validator');

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
// 🔒 SIGNUP ROUTE
// ============================
router.post('/signup', async (req, res) => {
  try {
    const { name, password, role , department, phonenumber } = req.body;

    // ✅ Basic validation
    if (!name || !password || !role || !department || !phonenumber) {
      return res.status(400).json({ message: 'Name , role , department, phonenumber and password are required.' });
    }

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ phonenumber });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create new user
    const newUser = new User({
      _id: new mongoose.Types.ObjectId(),
      name,
      // group,
      password: hashedPassword,
      role,
      phonenumber,
      department
    });

    await newUser.save();

    res.status(201).json({
      message: '✅ User registered successfully.',
      user: { name: newUser.name, group: newUser.group, role: newUser.role ,department:newUser.department,phonenumber: newUser.phonenumber }
    });

  } catch (error) {
    console.error('Signup Error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// ============================
// 🔑 LOGIN ROUTE
// ============================
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    
    // ✅ Check if user exists
    const user = await User.findOne({ name });
    if (!user) {
      return res.status(400).json({ message: 'User not found.' });
    }
console.log("USER FROM BACKEND:", user);

    // ✅ Compare password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password.' });
    }

    // ✅ Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({
      message: '✅ Login successful.',
      token,
      user: {
        id:user._id,
        name: user.name,
        group: user.group,
        role: user.role,
        department: user.department,
        phonenumber: user.phonenumber
      }
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});



// ============================
// 👑 ADMIN: CREATE NEW USER
// ============================
router.post('/create', verifyToken, async (req, res) => {
  try {
    // ✅ Only admin can create users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can create users.' });
    }

    const { name, group, password, role, department, phonenumber } = req.body;

    // ✅ Basic validation
    if (!name || !password) {
      return res.status(400).json({ message: 'Name , group, role, department, phonenumber and password are required.' });
    }

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ phonenumber });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create new user
    const newUser = new User({
      _id: new mongoose.Types.ObjectId(),
      name,
      group,
      password: hashedPassword,
      role,
      department,
      phonenumber,
    });

    await newUser.save();

    res.status(201).json({
      message: '✅ User created successfully by admin.',
      user: {
        name: newUser.name,
        group: newUser.group,
        role: newUser.role,
        department: newUser.department,
        phonenumber: newUser.phonenumber
      }
    });

  } catch (error) {
    console.error('Admin Create User Error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// ============================
// 👑 ADMIN: RETRIEVE ALL USERS
// ============================
router.get('/retrieve', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can view users.' });
    }

    const users = await User.find().select('-password');
    if (!users.length) {
      return res.status(404).json({ message: 'No users found.' });
    }

    res.status(200).json({ count: users.length, users });
  } catch (error) {
    console.error('Retrieve Users Error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// ============================
// 👑 ADMIN: RETRIEVE SINGLE USER
// ============================
router.get('/retrieve/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can view user details.' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Retrieve Single User Error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// ============================
// 👑 ADMIN: UPDATE USER
// ============================
router.put('/update/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can update users.' });
    }

    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // If password is being updated, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: '✅ User updated successfully.', user: updatedUser });
  } catch (error) {
    console.error('Update User Error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// ============================
// 👑 ADMIN: DELETE USER
// ============================
router.delete('/delete/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can delete users.' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: '✅ User deleted successfully.', deletedUser });
  } catch (error) {
    console.error('Delete User Error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});



// ====================================
// 👑 ADMIN: view all players progress
// ====================================

router.get("/admin/player",verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can delete users.' });
    }
    const players = await Progress.find()
      .populate("playerId", "-password") // show player details
      .lean();

    res.json({
      message: "All Players Progress",
      players
    });

  } catch (error) {
    console.error("Admin Fetch Players Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


// ====================================
// 👑 ADMIN: view one players progress
// ====================================
router.get("/admin/player/:playerId",verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can delete users.' });
    }
    const progress = await Progress.findOne({ playerId: req.params.playerId })
      .populate("playerId", "-password");

    if (!progress) {
      return res.status(404).json({ message: "Player not found or game not started" });
    }

    res.json({
      message: "Player Full Details",
      // playerInfo: progress.playerId,
      progress
    });

  } catch (error) {
    console.error("Admin View Player Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});




module.exports = router;
