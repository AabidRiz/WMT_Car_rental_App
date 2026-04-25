const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
  },
  incidentType: {
    type: String,
    enum: ['SOS', 'Accident', 'Breakdown', 'Mechanical Issue', 'Other'],
    default: 'SOS',
  },
  description: {
    type: String,
  },
  photos: [{
    type: String,
  }],
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  status: {
    type: String,
    enum: ['Open', 'Pending', 'Resolved', 'Cancelled'],
    default: 'Open',
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
