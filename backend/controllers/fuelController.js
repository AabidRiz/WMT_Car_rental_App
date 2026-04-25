// =============================================================
// controllers/fuelController.js
// PURPOSE: Module 4 (Subanujan) - Fuel consumption tracking.
// Performs the core math: fetching the Car's tankCapacity and
// kmPerLiter based on the active Booking ID, then calculating
// tank fullness percentage and remaining drivable kilometres.
// =============================================================

const FuelLog = require('../models/FuelLog');
const Booking = require('../models/Booking');
const Car = require('../models/Car');

// -----------------------------------------------------------
// @desc    Log a fuel top-up & upload receipt
// @route   POST /api/fuel
// @access  Private (User)
// VIVA EXPLANATION:
// The system looks at the provided bookingId, populates the Car,
// uses req.body.litresFilled to update the estimated tank volume,
// and mathematically calculates the 'tankPercentAfter' and
// 'kmRemainingAfter' which are returned to the frontend.
// -----------------------------------------------------------
exports.logFuel = async (req, res, next) => {
  try {
    const { bookingId, litresFilled, costPaid, stationName } = req.body;

    // Validate inputs
    if (!bookingId || !litresFilled) {
      return res.status(400).json({ message: 'Booking ID and Litres Filled are required.' });
    }

    // Verify booking belongs to user
    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
    if (!booking) {
      return res.status(404).json({ message: 'Active booking not found.' });
    }

    // Fetch Car details to get tankCapacity and kmPerLiter
    const car = await Car.findById(booking.car);
    if (!car) {
      return res.status(404).json({ message: 'Associated car not found.' });
    }

    // ----- MATH & LOGIC -----
    const parsedLitresFilled = parseFloat(litresFilled);

    // Find previous fuel log for this booking to get 'fuelLevelBefore'
    const lastFuelLog = await FuelLog.findOne({ booking: booking._id }).sort({ createdAt: -1 });

    let fuelLevelBefore = 0;
    if (lastFuelLog && lastFuelLog.fuelLevelAfter) {
      fuelLevelBefore = lastFuelLog.fuelLevelAfter;
    } else {
      // Assumption: If it's the first top-up, maybe the tank was near empty or half.
      // We will assume 10L for safety if no prior data exists. 
      // (In real life, starting fuel is noted at checkout).
      fuelLevelBefore = 10;
    }

    // Calculate new total fuel level (cap at tankCapacity so it doesn't overflow)
    let fuelLevelAfter = fuelLevelBefore + parsedLitresFilled;
    if (fuelLevelAfter > car.tankCapacity) {
      fuelLevelAfter = car.tankCapacity; // Prevent >100% bugs
    }

    const tankPercentAfter = (fuelLevelAfter / car.tankCapacity) * 100;
    const kmRemainingAfter = fuelLevelAfter * car.kmPerLiter;

    // ----- PHOTO UPLOAD -----
    let receiptPath = null;
    if (req.file) {
      const relativePath = req.file.path.split('uploads')[1].replace(/\\/g, '/');
      receiptPath = `uploads${relativePath}`;
    }

    const fuelLog = await FuelLog.create({
      booking: booking._id,
      car: car._id,
      user: req.user._id,
      litresFilled: parsedLitresFilled,
      fuelLevelBefore,
      fuelLevelAfter,
      tankPercentAfter: Math.round(tankPercentAfter),
      kmRemainingAfter: Math.round(kmRemainingAfter),
      costPaid: parseFloat(costPaid || 0),
      stationName,
      receiptPhoto: receiptPath,
    });

    res.status(201).json({
      success: true,
      message: `Your tank is now ${Math.round(tankPercentAfter)}% full. You can drive ~${Math.round(kmRemainingAfter)} more km.`,
      data: fuelLog,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Get all fuel logs for a booking
// @route   GET /api/fuel/:bookingId
// @access  Private (User/Admin)
// -----------------------------------------------------------
exports.getFuelLogs = async (req, res, next) => {
  try {
    const logs = await FuelLog.find({ booking: req.params.bookingId })
      .sort({ createdAt: -1 })
      .populate('car', 'name licensePlate');

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};
