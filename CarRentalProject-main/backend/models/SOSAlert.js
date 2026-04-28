// =============================================================
// models/SOSAlert.js
// PURPOSE: Records an emergency SOS event triggered by the user (Module 6 - Ekanayake).
// When John presses SOS:
//   1. Frontend calls Linking.openURL('tel:119')
//   2. Simultaneously, a POST to /api/sos/alert is made.
//   3. This document is created with the GPS coordinates.
//   4. Admin is notified (via the alertAdmin flag + socket/email in production).
//   5. User can then attach an Accident Report with a damage photo.
//   6. A PDF Accident Report is generated and its path stored here.
// =============================================================

const mongoose = require('mongoose');

const SOSAlertSchema = new mongoose.Schema(
  {
    // Who triggered the SOS
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Which booking was active during the emergency
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },

    // ------ GPS Coordinates ------
    // Sent by the mobile device at the moment of the SOS press
    location: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
      },
    },

    // Human-readable address (reverse geocoded on the frontend or via an API)
    locationDescription: {
      type: String,
      trim: true,
    },

    // Type of emergency
    emergencyType: {
      type: String,
      enum: ['SOS', 'Accident', 'Breakdown', 'Medical', 'Other'],
      default: 'SOS',
    },

    // Additional description from the user
    description: {
      type: String,
      trim: true,
    },

    // ------ Admin Alert ------
    // true = Admin has been notified (set automatically on creation)
    adminAlerted: {
      type: Boolean,
      default: true,
    },

    // Has the Admin acknowledged / resolved this alert?
    resolvedByAdmin: {
      type: Boolean,
      default: false,
    },

    adminNote: {
      type: String,
      trim: true,
    },

    adminReply: {
      type: String,
      trim: true,
    },
    
    repliedAt: {
      type: Date
    },

    // ------ Accident Report Fields ------
    // Populated after user submits the detailed accident report

    // Damage description (text)
    damageDescription: {
      type: String,
      trim: true,
    },

    // Path to the uploaded damage photos (Multer – Module 6)
    photos: [{
      type: String, // e.g. 'uploads/sos/damage_xyz.jpg'
    }],

    // Priority level for the incident
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium'
    },

    // Estimated damage cost (filled by Admin after inspection)
    estimatedDamageCost: {
      type: Number,
      default: 0,
    },

    // ------ PDF Accident Report ------
    // Path to the auto-generated PDF accident report (pdfkit)
    accidentReportPdfPath: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SOSAlert', SOSAlertSchema);
