const Incident = require('../models/Incident');
const Booking = require('../models/Booking');

// @desc    Report an Emergency or Accident
// @route   POST /api/incidents
// @access  Private (User)
exports.reportIncident = async (req, res, next) => {
  try {
    const { bookingId, incidentType, description, lat, lng, address } = req.body;

    // Verify booking
    const booking = await Booking.findById(bookingId).populate('car');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // Handle photos if any
    const imagePaths = [];
    if (req.files) {
      req.files.forEach((file) => {
        const relativePath = file.path.split('uploads')[1].replace(/\\/g, '/');
        imagePaths.push(`uploads${relativePath}`);
      });
    }

    const incident = await Incident.create({
      user: req.user._id,
      booking: bookingId,
      car: booking.car?._id,
      incidentType: incidentType || 'SOS',
      description,
      photos: imagePaths,
      location: { lat, lng, address },
      priority: incidentType === 'SOS' || incidentType === 'Accident' ? 'High' : 'Medium'
    });

    res.status(201).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's incidents
// @route   GET /api/incidents/my
// @access  Private
exports.getMyIncidents = async (req, res, next) => {
  try {
    const incidents = await Incident.find({ user: req.user._id })
      .populate('car')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all incidents (Admin)
// @route   GET /api/incidents
// @access  Private (Admin)
exports.getAllIncidents = async (req, res, next) => {
  try {
    const incidents = await Incident.find()
      .populate('user', 'name email phone')
      .populate('car')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Incident Status (Admin)
// @route   PUT /api/incidents/:id
// @access  Private (Admin)
exports.updateIncidentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const incident = await Incident.findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    next(error);
  }
};
