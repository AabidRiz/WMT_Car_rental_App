const express = require('express');
const router = express.Router();
const { createTripPlan, addStopToTrip, uploadTicketPhoto, sendPushReminder, getTripPlanByBooking, updateTripPlan, deleteStop, getUserTripPlans, getTripPlanById, deleteTripPlan } = require('../controllers/timetableController');
const { protect } = require('../middleware/authMiddleware');
const { uploadTicketPhoto: uploadTicketMw } = require('../middleware/uploadMiddleware');

router.use(protect);

router.post('/', createTripPlan);
router.get('/', getUserTripPlans);
router.get('/:id', getTripPlanById);
router.get('/booking/:bookingId', getTripPlanByBooking);
router.put('/:id', updateTripPlan);
router.post('/:id/stops', addStopToTrip);
router.delete('/:planId/stops/:stopId', deleteStop);
router.put('/:planId/stops/:stopId/ticket', uploadTicketMw.single('ticketPhoto'), uploadTicketPhoto);
router.post('/:planId/stops/:stopId/remind', sendPushReminder);
router.delete('/:id', deleteTripPlan);

module.exports = router;
