// =============================================================
// models/FuelLog.js
// PURPOSE: Records each fuel top-up during the rental (Module 4 - Subanujan).
// KEY MATH (performed in fuelController and stored here):
//   tankPercentAfter  = (totalFuelInTank / car.tankCapacity) × 100
//   kmRemainingAfter  = totalFuelInTank × car.kmPerLiter
// The controller chains Booking → Car to fetch kmPerLiter & tankCapacity.
// =============================================================

const mongoose = require('mongoose');

const FuelLogSchema = new mongoose.Schema(
  {
    // ----- Relationships -----
    // Link to the active booking so we can find the correct Car
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
    },

    // Denormalised Car reference for quick lookups without populating Booking first
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car',
      required: [true, 'Car reference is required'],
    },

    // Who logged this (the renting user)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ----- Fuel Input -----
    // How many litres were added at the station
    litresFilled: {
      type: Number,
      required: [true, 'Litres filled is required'],
      min: [0.1, 'Must fill at least 0.1 litre'],
    },

    // Estimated fuel level BEFORE this top-up (in litres)
    // If null, it means we have no previous log (first top-up)
    fuelLevelBefore: {
      type: Number,
      default: 0,
    },

    // Total fuel in tank AFTER this top-up (in litres)
    // = fuelLevelBefore + litresFilled (capped at tankCapacity)
    fuelLevelAfter: {
      type: Number,
    },

    // ----- Computed Stats (stored for display & history) -----
    // Percentage of tank full after refuel (0–100)
    tankPercentAfter: {
      type: Number,
    },

    // Estimated kilometres remaining based on current fuel & efficiency
    kmRemainingAfter: {
      type: Number,
    },

    // Cost paid by the user at the pump (optional, informational)
    costPaid: {
      type: Number,
      default: 0,
    },

    // Station name / location for the log
    stationName: {
      type: String,
      trim: true,
    },

    // ----- Receipt Upload (Multer – Module 4) -----
    // Photo of the fuel receipt printed at the station
    receiptPhoto: {
      type: String, // e.g. 'uploads/fuel/fuel_receipt_xyz.jpg'
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FuelLog', FuelLogSchema);
