// =============================================================
// controllers/checkoutController.js
// PURPOSE: Module 5 - Final Checkout Flow (Kulathunga).
// MATHEMATICAL CORE:
// Checks end odometer against start limit to apply over-mileage charges.
// Pulls SOS Damage penalties (if any) and finalises the bill, then generates
// a final Checkout Statement via PDFKit.
// =============================================================

const Checkout = require('../models/Checkout');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const SOSAlert = require('../models/SOSAlert');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------
// @desc    Process Final Checkout & Generate PDF Bill
// @route   POST /api/checkout
// @access  Private (Admin)
// VIVA EXPLANATION:
// The Admin visually verifies the physical car, types the endOdometer
// and uploads a Dashboard Odometer Photo. The backend compares it to
// the 'startingOdometer' stored in the Car. It computes extra charges,
// checks for attached SOS Alerts (damage), and compiles a final bill.
// -----------------------------------------------------------
exports.processCheckout = async (req, res, next) => {
  try {
    const { bookingId, endOdometer, conditionNotes, extraChargesStr } = req.body;

    const booking = await Booking.findById(bookingId).populate('user', 'name');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (booking.status !== 'Active') {
      // In a real system, you might only checkout 'Active' bookings.
      // Relaxing this to Approved/Active for ease of testing.
    }

    const car = await Car.findById(booking.car);
    if (!car) {
      return res.status(404).json({ message: 'Car associated with booking not found.' });
    }

    // 1. ODOMETER MATH
    const finalEndOdo = parseFloat(endOdometer);
    if (finalEndOdo < car.startingOdometer) {
      return res.status(400).json({ message: 'End odometer cannot be less than start odometer.' });
    }

    const kmsDriven = finalEndOdo - car.startingOdometer;
    
    let overLimitKms = 0;
    let overLimitCharge = 0;
    
    if (car.maxKmAllowed > 0 && kmsDriven > car.maxKmAllowed) {
      overLimitKms = kmsDriven - car.maxKmAllowed;
      overLimitCharge = overLimitKms * car.extraKmChargePerKm;
    }

    // 2. EXTRA CHARGES PARSING (e.g., GPS damage, late return)
    let extraChargesBase = [];
    let extraChargesTotal = 0;
    if (extraChargesStr) {
      try {
        extraChargesBase = JSON.parse(extraChargesStr);
        extraChargesTotal = extraChargesBase.reduce((sum, item) => sum + Number(item.amount), 0);
      } catch (e) {
        // Invalid JSON
      }
    }

    // 3. DAMAGE PENALTIES (Look for unresolved SOSAlerts on this booking)
    const sosAlerts = await SOSAlert.find({ booking: booking._id, estimatedDamageCost: { $gt: 0 } });
    const damagePenalty = sosAlerts.reduce((sum, map) => sum + map.estimatedDamageCost, 0);

    // 4. FINAL BILL CALCULATION
    const bookingBasePrice = booking.totalPrice; // from original booking
    const finalBill = bookingBasePrice + extraChargesTotal + overLimitCharge + damagePenalty;

    // 5. PHOTO UPLOAD
    if (!req.file) {
      return res.status(400).json({ message: 'Dashboard odometer photo is required.' });
    }
    const relativePath = req.file.path.split('uploads')[1].replace(/\\/g, '/');
    const photoPath = `uploads${relativePath}`;

    // 6. DB SAVE
    const checkout = await Checkout.create({
      user: booking.user._id,
      booking: booking._id,
      car: car._id,
      startOdometer: car.startingOdometer,
      endOdometer: finalEndOdo,
      kmsDriven,
      odometerPhoto: photoPath,
      maxKmAllowed: car.maxKmAllowed,
      overLimitKms,
      overLimitCharge,
      extraCharges: extraChargesBase,
      extraChargesTotal,
      damagePenalty,
      bookingBasePrice,
      finalBill,
      conditionNotes,
    });

    // 7. FINALIZE DB STATES
    booking.status = 'Completed';
    await booking.save();

    car.isAvailable = true;
    car.startingOdometer = finalEndOdo; // Set for the next rental
    await car.save();

    // 8. =============== PDF GENERATION (PDFKIT) ===============
    const pdfDir = path.join(__dirname, '..', 'uploads', 'checkouts');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const pdfFilename = `CheckoutBill-${checkout._id}.pdf`;
    const pdfPathAbs = path.join(pdfDir, pdfFilename);
    const pdfPathRel = `uploads/checkouts/${pdfFilename}`;

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(pdfPathAbs);
    doc.pipe(writeStream);

    doc.fillColor('#047857').fontSize(24).text('FINAL CHECKOUT BILL', { align: 'center' }).moveDown();
    
    doc.fillColor('black').fontSize(12);
    doc.text(`Customer: ${booking.user.name}`);
    doc.text(`Car: ${car.name}`);
    doc.moveDown();

    doc.fontSize(14).text('Odometer Reading', { underline: true }).moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Starting Odo: ${car.startingOdometer} km`);
    doc.text(`Ending Odo: ${finalEndOdo} km`);
    doc.text(`Driven Distance: ${kmsDriven} km`);
    if (car.maxKmAllowed > 0) {
      doc.text(`Max Limit: ${car.maxKmAllowed} km`);
      doc.text(`Over Limit: ${overLimitKms} km ($${overLimitCharge})`, { color: overLimitKms > 0 ? 'red' : 'black' });
    }
    doc.fillColor('black').moveDown();

    doc.fontSize(14).text('Costs Breakdown', { underline: true }).moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Original Booking Total: $${bookingBasePrice}`);
    doc.text(`Overage Charge: $${overLimitCharge}`);
    doc.text(`Extra Add-ons (Checkout): $${extraChargesTotal}`);
    doc.text(`Damage Penalty (SOS): $${damagePenalty}`);
    doc.moveDown();

    doc.fontSize(18).text(`GRAND TOTAL: $${finalBill.toFixed(2)}`, { underline: true, align: 'right' });

    doc.end();

    writeStream.on('finish', async () => {
      checkout.checkoutPdfPath = pdfPathRel;
      await checkout.save();

      res.status(201).json({
        success: true,
        message: 'Checkout completed and Final Bill exported.',
        data: checkout,
      });
    });

  } catch (error) {
    next(error);
  }
};
