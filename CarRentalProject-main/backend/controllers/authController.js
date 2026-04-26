// =============================================================
// controllers/authController.js
// PURPOSE: Handles User Registration and Login.
// Generates JWT tokens for authorised access.
// =============================================================

const User = require('../models/User');
const jwt = require('jsonwebtoken');

// -----------------------------------------------------------
// HELPER: Generate JWT Token
// Signs the user's ID into a token valid for 30 days.
// -----------------------------------------------------------
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// -----------------------------------------------------------
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// -----------------------------------------------------------
exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user (password is hashed automatically by the pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      phone,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        phone: user.phone,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
// -----------------------------------------------------------
exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    // Verify password using the instance method defined in User model
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        phone: user.phone,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Forgot Password / Reset
// @route   POST /api/auth/forgot-password
// @access  Public
// -----------------------------------------------------------
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Update user profile & avatar
// @route   PUT /api/auth/profile
// @access  Public
// -----------------------------------------------------------
exports.updateProfile = async (req, res, next) => {
  try {
    const { userId, email, name, profilePicture, password, phone } = req.body;
    
    // Find the user by ID definitively
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email) user.email = email;
    if (name) user.name = name;
    if (profilePicture) user.profilePicture = profilePicture;
    if (password) user.password = password;
    if (phone) user.phone = phone;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
      phone: updatedUser.phone,
    });
  } catch (error) {
    next(error);
  }
};
