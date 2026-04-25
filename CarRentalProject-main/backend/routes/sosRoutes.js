const express = require('express');
const router = express.Router();
const { 
  triggerSOS, 
  submitAccidentReport, 
  resolveSOS, 
  getMySOS, 
  getAllSOS, 
  replyToSOS, 
  deleteSOS 
} = require('../controllers/sosController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadDamagePhoto } = require('../middleware/uploadMiddleware');

router.post('/', protect, triggerSOS);
router.get('/my', protect, getMySOS);
router.get('/admin', protect, adminOnly, getAllSOS);
router.put('/:id/report', protect, uploadDamagePhoto.array('images', 5), submitAccidentReport);
router.put('/:id/admin-resolve', protect, adminOnly, resolveSOS);
router.put('/:id/reply', protect, adminOnly, replyToSOS);
router.delete('/:id', protect, deleteSOS);

module.exports = router;
