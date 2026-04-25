const express = require('express');
const router = express.Router();
const { reportIncident, getMyIncidents, getAllIncidents, updateIncidentStatus } = require('../controllers/incidentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadCarImages } = require('../middleware/uploadMiddleware'); // Re-using Multer config

// User routes
router.post('/', protect, uploadCarImages.array('images', 5), reportIncident);
router.get('/my', protect, getMyIncidents);

// Admin routes
router.get('/', protect, adminOnly, getAllIncidents);
router.put('/:id', protect, adminOnly, updateIncidentStatus);

module.exports = router;
