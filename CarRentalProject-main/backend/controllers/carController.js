// =============================================================
// controllers/carController.js
// PURPOSE: Handles Fleet Management (Module 6 - Ekanayake).
// Admins add new cars and upload up to 3 images via Multer.
// Users can query available cars.
// =============================================================

const Car = require('../models/Car');

// -----------------------------------------------------------
// @desc    Add a new car to the fleet
// @route   POST /api/cars
// @access  Private/Admin
// VIVA EXPLANATION:
// The route will use the 'uploadCarImages.array("images", 3)' middleware.
// This puts the uploaded file data into req.files. We loop through it,
// extract the internal paths, and save them to the MongoDB Car document.
// -----------------------------------------------------------
exports.addCar = async (req, res, next) => {
  try {
    const {
      name,
      brand,
      year,
      licensePlate,
      pricePerDay,
      kmPerLiter,
      tankCapacity,
      description,
      fuelType,
      transmission,
      seats,
      currentFuel,
    } = req.body;

    // Extract file paths from Multer (req.files)
    // We store the relative path (e.g., 'uploads/cars/images-123.jpg')
    const imagePaths = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // Normalise path for cross-platform compatibility
        const relativePath = file.path.split('uploads')[1].replace(/\\/g, '/');
        imagePaths.push(`uploads${relativePath}`);
      });
    }

    // Validation: Admin MUST upload at least 1 image and max 3
    if (imagePaths.length === 0) {
      return res.status(400).json({ message: 'You must upload at least 1 image of the car.' });
    }

    const car = await Car.create({
      name,
      brand,
      year,
      licensePlate,
      pricePerDay,
      kmPerLiter,
      tankCapacity,
      description,
      fuelType,
      transmission,
      seats,
      currentFuel,
      images: imagePaths,
      addedBy: req.user._id, // Set by authMiddleware (protect)
    });

    res.status(201).json({
      success: true,
      message: 'Car added successfully',
      data: car,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Get all cars (or filter by availability)
// @route   GET /api/cars
// @access  Public
// -----------------------------------------------------------
exports.getCars = async (req, res, next) => {
  try {
    // Allows query filtering like ?isAvailable=true
    const filter = {};
    if (req.query.isAvailable) {
      filter.isAvailable = req.query.isAvailable === 'true';
    }

    const cars = await Car.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cars.length,
      data: cars,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Get single car by ID
// @route   GET /api/cars/:id
// @access  Public
// -----------------------------------------------------------
exports.getCarById = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.status(200).json({ success: true, data: car });
  } catch (error) {
    next(error);
  }
};

// Toggle car availability (Admin manual override)
exports.toggleAvailability = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    car.isAvailable = !car.isAvailable;
    await car.save();
    res.status(200).json({ success: true, isAvailable: car.isAvailable });
  } catch (error) {
    next(error);
  }
};

// Update car (Admin)
exports.updateCar = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    const { existingImages } = req.body;
    let imagesToKeep = [];
    if (existingImages) {
      try {
        imagesToKeep = JSON.parse(existingImages);
      } catch (e) {
        imagesToKeep = [];
      }
    }

    // Handle Image Uploads if any
    const updatedImages = [...imagesToKeep];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const relativePath = file.path.split('uploads')[1].replace(/\\/g, '/');
        updatedImages.push(`uploads${relativePath}`);
      });
    }

    if (updatedImages.length > 0) {
      updateData.images = updatedImages;
    }

    const car = await Car.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after', runValidators: false });
    if (!car) return res.status(404).json({ message: 'Car not found' });
    
    res.status(200).json({ success: true, data: car });
  } catch (error) {
    next(error);
  }
};

// Delete car (Admin)
exports.deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    res.status(200).json({ success: true, message: 'Car deleted' });
  } catch (error) {
    next(error);
  }
};

// Update only fuel (User accessible)
exports.updateFuel = async (req, res, next) => {
  try {
    const { currentFuel } = req.body;
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    
    car.currentFuel = currentFuel;
    await car.save();
    
    res.status(200).json({ success: true, data: car });
  } catch (error) {
    next(error);
  }
};
