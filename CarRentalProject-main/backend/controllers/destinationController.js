// =============================================================
// controllers/destinationController.js
// PURPOSE: Module 2 (Anuhas) - Manage tourist destinations.
// Users can query, favorite, and upload a cover photo.
// Includes the logic for adding to the Module 3 TripPlan.
// =============================================================

const Destination = require('../models/Destination');

// -----------------------------------------------------------
// @desc    Create a new Destination (with cover photo upload)
// @route   POST /api/destinations
// @access  Private (User)
// -----------------------------------------------------------
exports.createDestination = async (req, res, next) => {
  try {
    const { name, description, location, lat, lng, notes, category } = req.body;

    let coverPhotoPath = null;
    if (req.file) {
      const relativePath = req.file.path.split('uploads')[1].replace(/\\/g, '/');
      coverPhotoPath = `uploads${relativePath}`;
    }

    const destination = await Destination.create({
      user: req.user._id,
      name,
      description,
      location,
      coordinates: { lat, lng },
      notes,
      category,
      coverPhoto: coverPhotoPath,
    });

    res.status(201).json({
      success: true,
      data: destination,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Get user's Destinations (filtering by favourite)
// @route   GET /api/destinations
// @access  Private (User)
// -----------------------------------------------------------
exports.getDestinations = async (req, res, next) => {
  try {
    // Only fetch for the logged-in user
    const filter = { user: req.user._id };
    if (req.query.isFavourite) {
      filter.isFavourite = req.query.isFavourite === 'true';
    }

    const destinations = await Destination.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: destinations.length,
      data: destinations,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Toggle Favourite status
// @route   PUT /api/destinations/:id/favourite
// @access  Private (User)
// -----------------------------------------------------------
exports.toggleFavourite = async (req, res, next) => {
  try {
    const destination = await Destination.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!destination) {
      return res.status(404).json({ message: 'Destination not found.' });
    }

    destination.isFavourite = !destination.isFavourite;
    await destination.save();

    res.status(200).json({
      success: true,
      message: destination.isFavourite ? 'Added to Favourites' : 'Removed from Favourites',
      data: destination,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    "Add to Trip Plan" Action (Connects Module 2 to 3)
// @route   PUT /api/destinations/:id/add-to-trip
// @access  Private (User)
// VIVA EXPLANATION:
// Sets 'addedToTripPlan' flag. The tripPlanController will pick
// this up to bind it into the timetable schedule.
// -----------------------------------------------------------
exports.addToTripPlan = async (req, res, next) => {
  try {
    const { tripPlanId } = req.body; // Passed from frontend

    const destination = await Destination.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!destination) {
      return res.status(404).json({ message: 'Destination not found.' });
    }

    destination.addedToTripPlan = true;
    destination.tripPlanId = tripPlanId; // Link to Module 3 model
    await destination.save();

    res.status(200).json({
      success: true,
      message: 'Destination pushed to Trip Plan successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Get all popular destinations (admin-added, public)
exports.getPopularDestinations = async (req, res, next) => {
  try {
    const destinations = await Destination.find({ isPopular: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: destinations });
  } catch (error) {
    next(error);
  }
};

// Admin adds a popular destination
exports.addPopularDestination = async (req, res, next) => {
  try {
    const { name, description, location, lat, lng, category } = req.body;
    let coverPhotoPath = null;
    if (req.file) {
      const relativePath = req.file.path.split('uploads')[1].replace(/\\/g, '/');
      coverPhotoPath = `uploads${relativePath}`;
    }
    const destination = await Destination.create({
      user: req.user._id,
      name, description, location, category,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      coverPhoto: coverPhotoPath,
      isPopular: true,
    });
    res.status(201).json({ success: true, data: destination });
  } catch (error) {
    next(error);
  }
};
