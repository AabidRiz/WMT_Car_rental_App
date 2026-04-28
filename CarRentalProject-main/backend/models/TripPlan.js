// =============================================================
// models/TripPlan.js
// PURPOSE: Timetable / Itinerary for a user's rental trip (Module 3 - Gunawardana).
// Each TripPlan belongs to a Booking (so we know which car and dates apply).
// It contains an array of ScheduledStops, each linked to a Destination.
// Google Maps travel times and push notification reminders hook into this.
// =============================================================

const mongoose = require('mongoose');

// -------------------------------------------------------
// SUB-DOCUMENT: ScheduledStop
// A single scheduled event in the trip plan.
// -------------------------------------------------------
const ScheduledStopSchema = new mongoose.Schema({
  // Which destination is being visited (from Module 2)
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
    required: true,
  },

  // Which day of the trip (1-based, e.g., Day 2)
  dayNumber: {
    type: Number,
    required: [true, 'Day number is required'],
    min: 1,
  },

  // Scheduled start time as a string, e.g. "08:00 AM"
  scheduledTime: {
    type: String,
    required: [true, 'Scheduled time is required'],
  },

  // Activity label, e.g. "Morning Safari at Yala"
  activityLabel: {
    type: String,
    trim: true,
  },

  // Notes or special instructions for this stop
  notes: {
    type: String,
    trim: true,
  },

  // -----------------------------------------------------------
  // TICKET PHOTO (Multer – Module 3)
  // User uploads proof-of-entry ticket image for this stop.
  // e.g. "Safari Entrance Ticket"
  // -----------------------------------------------------------
  ticketPhoto: {
    type: String, // e.g. 'uploads/tickets/yala_ticket.jpg'
  },

  // -----------------------------------------------------------
  // GOOGLE MAPS TRAVEL TIME
  // Populated by the timetableController when it calls the
  // Google Maps Distance Matrix API from the previous stop (or hotel)
  // to this destination's coordinates.
  // -----------------------------------------------------------
  travelTimeFromPrevious: {
    type: String, // human-readable, e.g. "1 hour 23 mins"
    default: null,
  },

  travelDistanceFromPrevious: {
    type: String, // e.g. "87.4 km"
    default: null,
  },

  // -----------------------------------------------------------
  // PUSH NOTIFICATION REMINDER
  // When set to true, the backend scheduler has already sent /
  // queued a reminder notification for this stop.
  // -----------------------------------------------------------
  reminderSent: {
    type: Boolean,
    default: false,
  },
});

// -------------------------------------------------------
// MAIN SCHEMA: TripPlan
// -------------------------------------------------------
const TripPlanSchema = new mongoose.Schema(
  {
    // Who created this plan
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Which booking (car + dates) this plan belongs to.
    // A booking can have only ONE trip plan.
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },

    // Human-readable plan title, e.g. "3-Day Sri Lanka Southern Circuit"
    title: {
      type: String,
      trim: true,
      default: 'My Trip Plan',
    },

    // Ordered list of scheduled stops (embedded sub-documents)
    stops: [ScheduledStopSchema],

    // Is the plan finalised by the user?
    isFinalized: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TripPlan', TripPlanSchema);
