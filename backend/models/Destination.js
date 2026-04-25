// =============================================================
// models/Destination.js
// PURPOSE: Stores tourist destinations browsed by users (Module 2 - Anuhas).
// Users can save favorites, add personal notes, upload a cover photo,
// and link the destination directly to their Trip Plan (Module 3).
// =============================================================

const mongoose = require('mongoose');

const DestinationSchema = new mongoose.Schema(
  {
    // Destination display name, e.g. "Yala National Park"
    name: {
      type: String,
      required: [true, 'Destination name is required'],
      trim: true,
    },

    // Which user created / saved this destination entry
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Short description: history, tips, etc.
    description: {
      type: String,
      trim: true,
    },

    // Country / city location label
    location: {
      type: String,
      trim: true,
    },

    // -------------------------------------------------------
    // GEO COORDINATES
    // Used by Module 3 (Google Maps API) to calculate travel time.
    // Stored as { lat, lng } so they can be passed directly
    // to the Google Maps Distance Matrix API.
    // -------------------------------------------------------
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // User's personal notes about the destination (e.g., "Book safari early!")
    notes: {
      type: String,
      trim: true,
    },

    // Category for filtering (Nature / Beach / Heritage / City)
    category: {
      type: String,
      enum: ['Nature', 'Beach', 'Heritage', 'City', 'Adventure', 'Other'],
      default: 'Other',
    },

    // Is this destination saved as a favourite by the user?
    isFavourite: {
      type: Boolean,
      default: false,
    },

    // -------------------------------------------------------
    // COVER PHOTO (Multer – Module 2)
    // Admin or user uploads a representative image of the place.
    // -------------------------------------------------------
    coverPhoto: {
      type: String, // e.g. 'uploads/destinations/yala_park.jpg'
    },

    // -------------------------------------------------------
    // TRIP PLAN LINKAGE
    // When the user clicks "Add to Trip Plan", this flag is set
    // and the associated TripPlan document ID is stored.
    // The tripPlanController then reads this reference.
    // -------------------------------------------------------
    addedToTripPlan: {
      type: Boolean,
      default: false,
    },

    tripPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TripPlan',
      default: null,
    },

    // Is this a standard/popular destination added by Admin?
    isPopular: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Destination', DestinationSchema);
