const express = require('express');
const router = express.Router();
const { processCheckout } = require('../controllers/checkoutController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadOdometerPhoto } = require('../middleware/uploadMiddleware');

// Only Admins process checkouts in real life to verify the physical car
router.post('/', protect, adminOnly, uploadOdometerPhoto.single('odometerPhoto'), processCheckout);

module.exports = router;
