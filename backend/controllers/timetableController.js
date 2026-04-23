// =============================================================
// controllers/timetableController.js
// PURPOSE: Module 3 (Gunawardana) - Trip Plan & Schedule.
// Pushes a Destination into a ScheduledStop.
// Calculates mock Google Maps travel time and distance.
// Includes a ticket photo upload handler.
// =============================================================

const TripPlan = require('../models/TripPlan');
const Booking = require('../models/Booking');
const Destination = require('../models/Destination');

// -----------------------------------------------------------
// @desc    Initialize a new Trip Plan for a Booking
// @route   POST /api/trips
// @access  Private (User)
// -----------------------------------------------------------
exports.createTripPlan = async (req, res, next) => {
  try {
    const { bookingId, title } = req.body;

    // Verify booking belongs to user
    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const tripPlan = await TripPlan.create({
      user: req.user._id,
      booking: booking._id,
      title: title || 'My Trip Plan',
      stops: [],
    });

    res.status(201).json({
      success: true,
      data: tripPlan,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Add a Stop to a Trip Plan (Includes Map Logic)
// @route   POST /api/trips/:id/stops
// @access  Private (User)
// VIVA EXPLANATION:
// In a real production map setup, we would call the Google Maps Distance
// Matrix API here between the previous stop's coords and this one.
// We are simulating that logic mathematically based on the story flow.
// -----------------------------------------------------------
exports.addStopToTrip = async (req, res, next) => {
  try {
    const { destinationId, dayNumber, scheduledTime, activityLabel, notes } = req.body;

    const tripPlan = await TripPlan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!tripPlan) {
      return res.status(404).json({ message: 'Trip Plan not found.' });
    }

    // Verify Destination exists
    const dest = await Destination.findById(destinationId);
    if (!dest) {
      return res.status(404).json({ message: 'Destination not found.' });
    }

    // ----- MOCK GOOGLE MAPS API LOGIC -----
    // If it's not the first stop, calculate distance/time from the last stop
    let mockTravelTime = null;
    let mockTravelDistance = null;

    if (tripPlan.stops.length > 0) {
      // Simplistic simulation: 2 hours and 85km from anywhere
      // In reality: axios.get(`https://maps.googleapis.com/maps/api/distancematrix/...`)
      mockTravelTime = "2 hours 15 mins";
      mockTravelDistance = "85.2 km";
    } else {
      mockTravelTime = "Start from Hotel";
      mockTravelDistance = "0 km";
    }

    const newStop = {
      destination: destinationId,
      dayNumber,
      scheduledTime,
      activityLabel,
      notes,
      travelTimeFromPrevious: mockTravelTime,
      travelDistanceFromPrevious: mockTravelDistance,
    };

    tripPlan.stops.push(newStop);
    await tripPlan.save();

    res.status(200).json({
      success: true,
      data: tripPlan,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Upload Entrance/Safari Ticket for a Stop
// @route   PUT /api/trips/:planId/stops/:stopId/ticket
// @access  Private (User)
// -----------------------------------------------------------
exports.uploadTicketPhoto = async (req, res, next) => {
  try {
    const { planId, stopId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'Ticket photo is required.' });
    }

    const relativePath = req.file.path.split('uploads')[1].replace(/\\/g, '/');
    const ticketPath = `uploads${relativePath}`;

    const tripPlan = await TripPlan.findOne({ _id: planId, user: req.user._id });
    if (!tripPlan) {
      return res.status(404).json({ message: 'Trip Plan not found.' });
    }

    const stop = tripPlan.stops.id(stopId);
    if (!stop) {
      return res.status(404).json({ message: 'Stop not found in this trip plan.' });
    }

    stop.ticketPhoto = ticketPath;
    await tripPlan.save();

    res.status(200).json({
      success: true,
      message: 'Ticket photo uploaded successfully.',
      data: tripPlan,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Push Notification Reminder Simulation
// @route   POST /api/trips/:planId/stops/:stopId/remind
// @access  Private
// VIVA EXPLANATION:
// Normally, a corn-job (node-cron) would trigger this automatically.
// The code looks up the user's push notification token (Expo token).
// -----------------------------------------------------------
exports.sendPushReminder = async (req, res, next) => {
  try {
    const { planId, stopId } = req.params;

    const tripPlan = await TripPlan.findById(planId).populate('user');
    const stop = tripPlan.stops.id(stopId);

    if (!tripPlan || !stop) {
      return res.status(404).json({ message: 'Not found.' });
    }

    const userToken = tripPlan.user.pushToken;
    let pushResult = 'No push token saved for user.';

    if (userToken) {
      // E.g., send via Expo SDK
      // const expo = new Expo();
      // expo.sendPushNotificationsAsync([{ to: userToken, sound: 'default', body: `Upcoming stop: ${stop.activityLabel}` }]);
      pushResult = `Push notification sent to ${userToken}`;
      stop.reminderSent = true;
      await tripPlan.save();
    }

    res.status(200).json({
      success: true,
      message: pushResult,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Get Trip Plan for a specific Booking
// @route   GET /api/trips/booking/:bookingId
// @access  Private (User)
// -----------------------------------------------------------
exports.getTripPlanByBooking = async (req, res, next) => {
  try {
    const tripPlan = await TripPlan.findOne({
      booking: req.params.bookingId,
      user: req.user._id,
    }).populate('stops.destination');

    if (!tripPlan) {
      return res.status(200).json({ success: true, data: null });
    }

    res.status(200).json({ success: true, data: tripPlan });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Update Full Trip Plan (Saves stops array)
// @route   PUT /api/trips/:id
// @access  Private (User)
// -----------------------------------------------------------
exports.updateTripPlan = async (req, res, next) => {
  try {
    const { stops, title, isFinalized } = req.body;
    const tripPlan = await TripPlan.findOne({ _id: req.params.id, user: req.user._id });

    if (!tripPlan) {
      return res.status(404).json({ message: 'Trip Plan not found.' });
    }

    if (stops) tripPlan.stops = stops;
    if (title) tripPlan.title = title;
    if (typeof isFinalized === 'boolean') tripPlan.isFinalized = isFinalized;

    await tripPlan.save();
    
    // Refresh to get populated data
    const updated = await TripPlan.findById(tripPlan._id).populate('stops.destination');

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Delete a specific stop from a Trip Plan
// @route   DELETE /api/trips/:planId/stops/:stopId
// @access  Private (User)
// -----------------------------------------------------------
exports.deleteStop = async (req, res, next) => {
  try {
    const { planId, stopId } = req.params;
    const tripPlan = await TripPlan.findOne({ _id: planId, user: req.user._id });

    if (!tripPlan) {
      return res.status(404).json({ message: 'Trip Plan not found.' });
    }

    tripPlan.stops = tripPlan.stops.filter(s => s._id.toString() !== stopId);
    await tripPlan.save();

    res.status(200).json({ success: true, message: 'Stop deleted.', data: tripPlan });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Get all Trip Plans for the logged-in User
// @route   GET /api/trips
// @access  Private (User)
// -----------------------------------------------------------
exports.getUserTripPlans = async (req, res, next) => {
  try {
    const tripPlans = await TripPlan.find({ user: req.user._id })
      .populate('booking')
      .populate({
        path: 'booking',
        populate: { path: 'car' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tripPlans.length,
      data: tripPlans,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Get Single Trip Plan by ID
// @route   GET /api/trips/:id
// @access  Private (User)
// -----------------------------------------------------------
exports.getTripPlanById = async (req, res, next) => {
  try {
    const tripPlan = await TripPlan.findById(req.params.id)
      .populate('booking')
      .populate({
        path: 'booking',
        populate: { path: 'car' }
      })
      .populate('stops.destination');

    if (!tripPlan) {
      return res.status(404).json({ success: false, message: 'Trip plan not found' });
    }

    res.status(200).json({
      success: true,
      data: tripPlan,
    });
  } catch (error) {
    next(error);
  }
};
