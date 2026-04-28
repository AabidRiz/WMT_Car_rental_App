const express = require('express');
const router = express.Router();
const { registerUser, loginUser, forgotPassword, updateProfile } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.put('/profile', updateProfile);

module.exports = router;
