const express = require('express');
const router = express.Router();
const { addCar, getCars, getCarById, toggleAvailability, updateCar, deleteCar, updateFuel } = require('../controllers/carController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadCarImages } = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', getCars);
router.get('/:id', getCarById);

// Admin only: add a car with up to 3 images
router.post('/', protect, adminOnly, uploadCarImages.array('images', 3), addCar);

// Admin only: toggle availability
router.put('/:id/availability', protect, adminOnly, toggleAvailability);

// Admin only: update car details
router.put('/:id', protect, adminOnly, uploadCarImages.array('images', 3), updateCar);

// User/Admin: update fuel level
router.put('/:id/fuel', protect, updateFuel);

// Admin only: delete car
router.delete('/:id', protect, adminOnly, deleteCar);

module.exports = router;
