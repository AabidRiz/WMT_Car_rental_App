const express = require('express');
const router = express.Router();
const { createBooking, getBookings, getMyBookings, approveBooking, rejectBooking, cancelBooking, editBooking } = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadPaymentReceipt } = require('../middleware/uploadMiddleware');

// User: get my bookings
router.get('/my', protect, getMyBookings);

// Admin: get all bookings
router.get('/', protect, adminOnly, getBookings);

// User: create booking (bank slip optional for card payments)
router.post('/', protect, uploadPaymentReceipt.single('receipt'), createBooking);

// User: cancel booking
router.put('/:id/cancel', protect, cancelBooking);

// Admin: approve booking & generate PDF
router.put('/:id/approve', protect, adminOnly, approveBooking);

// Admin: reject booking
router.put('/:id/reject', protect, adminOnly, rejectBooking);

// User: edit booking dates (sends back to Pending for re-approval)
router.put('/:id/edit', protect, editBooking);

module.exports = router;

