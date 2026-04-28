const express = require('express');
const router = express.Router();
const { logFuel, getFuelLogs, updateFuelLog, deleteFuelLog } = require('../controllers/fuelController');
const { protect } = require('../middleware/authMiddleware');
const { uploadFuelReceipt } = require('../middleware/uploadMiddleware');

router.use(protect);

router.post('/', uploadFuelReceipt.single('receiptPhoto'), logFuel);
router.get('/:bookingId', getFuelLogs);
router.put('/:id', updateFuelLog);
router.delete('/:id', deleteFuelLog);

module.exports = router;
