// =============================================================
// middleware/authMiddleware.js
// PURPOSE: JWT Authentication & Role-based Authorisation Middleware.
// HOW IT WORKS:
//   1. `protect` extracts the Bearer token from the Authorization header.
//   2. Verifies it using JWT_SECRET from .env.
//   3. Fetches the user from MongoDB and attaches it to req.user.
//   4. `adminOnly` then checks if req.user.role === 'admin'.
// USAGE IN ROUTES:
//   router.post('/approve', protect, adminOnly, controller.approve)
// =============================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// -----------------------------------------------------------
// MIDDLEWARE: protect
// Verifies the JWT token sent in the Authorization header.
// Sets req.user so subsequent controllers know who is calling.
// -----------------------------------------------------------
const protect = async (req, res, next) => {
  let token;

  // The convention is: Authorization: Bearer <token>
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Decode and verify.  jwt.verify throws if invalid / expired.
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch the user from DB (excludes password from the result)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found. Token invalid.' });
      }

      next(); // Token is valid → proceed to the next middleware / controller
    } catch (error) {
      // JWT expired or tampered with
      return res.status(401).json({ message: 'Not authorised. Token failed.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorised. No token provided.' });
  }
};
// -----------------------------------------------------------
// MIDDLEWARE: adminOnly
// Must be used AFTER `protect` (so req.user already exists).
// Blocks anyone who is not an admin from proceeding.
// -----------------------------------------------------------
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admins only.' });
  }
};
module.exports = { protect, adminOnly };
