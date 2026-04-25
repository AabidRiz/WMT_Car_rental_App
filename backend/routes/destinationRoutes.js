const express = require('express');
const router = express.Router();
const { createDestination, getDestinations, toggleFavourite, addToTripPlan, getPopularDestinations, addPopularDestination } = require('../controllers/destinationController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadDestinationPhoto } = require('../middleware/uploadMiddleware');

// Public: get admin-added popular destinations (no auth needed for user browsing)
router.get('/popular', protect, getPopularDestinations);

// Admin: add a popular destination
router.post('/popular', protect, adminOnly, uploadDestinationPhoto.single('coverPhoto'), addPopularDestination);

// User: CRUD own destinations
router.use(protect);
router.route('/')
  .post(uploadDestinationPhoto.single('coverPhoto'), createDestination)
  .get(getDestinations);

router.put('/:id/favourite', toggleFavourite);
router.put('/:id/add-to-trip', addToTripPlan);

module.exports = router;

