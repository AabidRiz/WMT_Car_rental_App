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
const PDFDocument = require('pdfkit');

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

    // FIX #5: Validate litresFilled is a positive number
    const parsedLitresFilled = parseFloat(litresFilled);
    if (isNaN(parsedLitresFilled) || parsedLitresFilled <= 0) {
      return res.status(400).json({ message: 'litresFilled must be a positive number.' });
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

    // Find previous fuel log for this booking to get 'fuelLevelBefore'
    const lastFuelLog = await FuelLog.findOne({ booking: booking._id }).sort({ createdAt: -1 });

    let fuelLevelBefore = 0;
    if (lastFuelLog && lastFuelLog.fuelLevelAfter) {
      fuelLevelBefore = lastFuelLog.fuelLevelAfter;
    } else {
      // FIX #2: Use startingFuelLevel from the Booking if available,
      // otherwise fall back to 10L as a safe default.
      fuelLevelBefore = booking.startingFuelLevel || 10;
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
      // FIX #1: Use backticks for template literal
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
      // FIX #1: Use backticks for template literal
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
    // FIX #6: Verify the booking belongs to the requesting user (or they are admin)
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      ...(req.user.role !== 'admin' && { user: req.user._id }),
    });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or access denied.' });
    }

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

// -----------------------------------------------------------
// @desc    Update a specific fuel log
// @route   PUT /api/fuel/:id
// @access  Private (User/Admin)
// -----------------------------------------------------------
exports.updateFuelLog = async (req, res, next) => {
  try {
    const { litresFilled, costPaid, stationName } = req.body;
    let log = await FuelLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Fuel log not found' });
    }

    if (log.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this log' });
    }

    // FIX #3: If litresFilled is being updated, recalculate derived fields
    if (litresFilled !== undefined) {
      const parsedLitresFilled = parseFloat(litresFilled);
      if (isNaN(parsedLitresFilled) || parsedLitresFilled <= 0) {
        return res.status(400).json({ message: 'litresFilled must be a positive number.' });
      }

      const car = await Car.findById(log.car);
      if (!car) {
        return res.status(404).json({ message: 'Associated car not found.' });
      }

      let fuelLevelAfter = log.fuelLevelBefore + parsedLitresFilled;
      if (fuelLevelAfter > car.tankCapacity) {
        fuelLevelAfter = car.tankCapacity;
      }

      log.litresFilled = parsedLitresFilled;
      log.fuelLevelAfter = fuelLevelAfter;
      log.tankPercentAfter = Math.round((fuelLevelAfter / car.tankCapacity) * 100);
      log.kmRemainingAfter = Math.round(fuelLevelAfter * car.kmPerLiter);
    }

    log.costPaid = costPaid !== undefined ? costPaid : log.costPaid;
    log.stationName = stationName || log.stationName;

    await log.save();

    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Delete a specific fuel log
// @route   DELETE /api/fuel/:id
// @access  Private (User/Admin)
// -----------------------------------------------------------
exports.deleteFuelLog = async (req, res, next) => {
  try {
    const log = await FuelLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Fuel log not found' });
    }

    if (log.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this log' });
    }

    await FuelLog.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Download fuel report as PDF
// @route   GET /api/fuel/:bookingId/report
// @access  Private (User/Admin)
// -----------------------------------------------------------
exports.downloadFuelReport = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const logs = await FuelLog.find({ booking: bookingId }).populate('car', 'name licensePlate').sort({ createdAt: 1 });

    if (!logs || logs.length === 0) {
      return res.status(404).json({ message: 'No fuel logs found for this booking to generate PDF.' });
    }

    const carName = logs[0].car ? logs[0].car.name : 'Vehicle';

    // Create a PDF Document
    const doc = new PDFDocument({ margin: 50 });

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    // FIX #1: Use backticks for template literal
    res.setHeader('Content-Disposition', `attachment; filename=fuel_report_${bookingId}.pdf`);

    // Send directly to client
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Fuel Consumption Report', { align: 'center' });
    doc.moveDown();

    // FIX #1: Use backticks for all template literals below
    doc.fontSize(12).text(`Booking Reference: ${bookingId}`);
    doc.text(`Vehicle: ${carName}`);
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);

    // Table Header
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Date',    50,      doc.y, { continued: true, width: 90 });
    doc.text('Litres',  140,     doc.y, { continued: true, width: 70 });
    doc.text('Cost',    210,     doc.y, { continued: true, width: 70 });
    doc.text('Tank %',  280,     doc.y, { continued: true, width: 70 });
    doc.text('Station', 350,     doc.y);
    doc.moveDown(0.5);

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Data
    doc.font('Helvetica');
    let totalCost = 0;
    let totalLitres = 0;

    logs.forEach(log => {
      const dateStr = new Date(log.createdAt).toLocaleDateString();
      // FIX #1: Use backticks for template literals
      // FIX #4: Use "Rs." instead of "$" for Sri Lankan Rupees
      doc.text(dateStr,                           50,  doc.y, { continued: true, width: 90 });
      doc.text(`${log.litresFilled || 0} L`,      140, doc.y, { continued: true, width: 70 });
      doc.text(`Rs. ${log.costPaid || 0}`,         210, doc.y, { continued: true, width: 70 });
      doc.text(`${log.tankPercentAfter || 0}%`,   280, doc.y, { continued: true, width: 70 });
      doc.text(log.stationName || 'N/A',          350, doc.y);
      doc.moveDown(0.5);

      // FIX #7: Use precise float accumulation to avoid floating point errors
      totalCost = Math.round((totalCost + (log.costPaid || 0)) * 100) / 100;
      totalLitres = Math.round((totalLitres + (log.litresFilled || 0)) * 100) / 100;
    });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Summary
    doc.font('Helvetica-Bold');
    // FIX #1 & #4: Backticks + Rs. currency
    doc.text(`Total Litres: ${totalLitres.toFixed(1)} L`,       50, doc.y);
    doc.text(`Total Cost Spent: Rs. ${totalCost.toFixed(2)}`,   50, doc.y);

    doc.end();
  } catch (error) {
    next(error);
  }
};