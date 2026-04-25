// =============================================================
// controllers/bookingController.js
// PURPOSE: Handles Module 1 - Booking & Payment (Aabid).
// =============================================================

const Booking = require('../models/Booking');
const Car = require('../models/Car');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Email transporter (uses Gmail - configure in .env)
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
  } catch (e) {
    console.log('Email send failed (non-critical):', e.message);
  }
};

// -----------------------------------------------------------
// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (User)
// -----------------------------------------------------------
exports.createBooking = async (req, res, next) => {
  try {
    const { carId, startDate, endDate, paymentMethod, addOns } = req.body;

    const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ message: 'Car not found.' });
    if (!car.isAvailable) return res.status(400).json({ message: 'Car is currently not available.' });

    let receiptPath = null;
    if (req.file) {
      const relativePath = req.file.path.split('uploads')[1].replace(/\\/g, '/');
      receiptPath = `uploads${relativePath}`;
    }
    // Card payments don't need a slip
    if (paymentMethod === 'BankTransfer' && !receiptPath) {
      return res.status(400).json({ message: 'Bank transfer receipt is required.' });
    }

    let parsedAddOns = [];
    if (addOns) {
      try { parsedAddOns = JSON.parse(addOns); } catch(e) {}
    }

    const booking = await Booking.create({
      user: req.user._id,
      car: carId,
      startDate,
      endDate,
      paymentMethod: paymentMethod || 'BankTransfer',
      paymentReceiptImage: receiptPath,
      addOns: parsedAddOns,
      status: 'Pending',
    });

    res.status(201).json({
      success: true,
      message: 'Booking created. Awaiting admin approval.',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Get ALL bookings (Admin view)
// @route   GET /api/bookings
// @access  Private/Admin
// -----------------------------------------------------------
exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('car', 'name brand licensePlate images currentFuel kmPerLiter tankCapacity')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Get MY bookings (User view)
// @route   GET /api/bookings/my
// @access  Private
// -----------------------------------------------------------
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('car', 'name brand images currentFuel kmPerLiter tankCapacity')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Approve Booking & Generate PDF Invoice
// @route   PUT /api/bookings/:id/approve
// @access  Private (Admin)
// -----------------------------------------------------------
exports.approveBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('car', 'name brand pricePerDay licensePlate currentFuel kmPerLiter tankCapacity');

    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status !== 'Pending') {
      return res.status(400).json({ message: `Cannot approve booking in ${booking.status} state.` });
    }

    booking.status = 'Approved';

    // Mark car unavailable
    await Car.findByIdAndUpdate(booking.car._id, { isAvailable: false });

    // ===== PDF GENERATION =====
    const pdfDir = path.join(__dirname, '..', 'uploads', 'invoices');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const pdfFilename = `Invoice-${booking._id}.pdf`;
    const pdfPathAbs = path.join(pdfDir, pdfFilename);
    const pdfPathRel = `uploads/invoices/${pdfFilename}`;

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(pdfPathAbs);
    doc.pipe(writeStream);

    doc.fillColor('#047857').fontSize(26).text('DriveMate - BOOKING INVOICE', { align: 'center' }).moveDown();
    doc.fillColor('black').fontSize(12)
      .text(`Invoice ID: ${booking._id}`)
      .text(`Customer: ${booking.user.name} (${booking.user.email})`)
      .text(`Car: ${booking.car.brand} ${booking.car.name} — ${booking.car.licensePlate}`)
      .text(`Start Date: ${new Date(booking.startDate).toLocaleDateString()}`)
      .text(`End Date: ${new Date(booking.endDate).toLocaleDateString()}`)
      .text(`Duration: ${booking.totalDays} Day(s)`)
      .text(`Payment Method: ${booking.paymentMethod}`)
      .moveDown();

    doc.text(`Base Price: LKR ${booking.basePrice}`);
    doc.text(`Add-ons Total: LKR ${booking.addOnsTotal}`);
    doc.fontSize(14).text(`Grand Total: LKR ${booking.totalPrice}`, { underline: true }).moveDown();
    doc.fontSize(10).fillColor('grey').text('Thank you for choosing DriveMate. Drive safely!', { align: 'center' });
    doc.end();

    writeStream.on('finish', async () => {
      booking.invoicePdfPath = pdfPathRel;
      await booking.save();

      // Send approval email
      await sendEmail(
        booking.user.email,
        'DriveMate — Booking Approved! 🎉',
        `<h2>Your booking has been approved!</h2>
         <p>Dear ${booking.user.name},</p>
         <p>Your booking for <b>${booking.car.brand} ${booking.car.name}</b> has been approved.</p>
         <p>Duration: <b>${booking.totalDays} day(s)</b></p>
         <p>Total: <b>LKR ${booking.totalPrice}</b></p>
         <p>Your invoice PDF is ready for download in the app.</p>
         <p>— DriveMate Team</p>`
      );

      res.status(200).json({ success: true, message: 'Booking approved. PDF generated.', data: booking });
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Reject Booking
// @route   PUT /api/bookings/:id/reject
// @access  Private (Admin)
// -----------------------------------------------------------
exports.rejectBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('car', 'name brand');

    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status !== 'Pending') {
      return res.status(400).json({ message: `Cannot reject booking in ${booking.status} state.` });
    }

    booking.status = 'Cancelled';
    booking.isCancelled = true;
    booking.cancelledAt = new Date();
    booking.adminNote = req.body.reason || 'Payment rejected by admin.';
    await booking.save();

    // Send rejection email
    await sendEmail(
      booking.user.email,
      'DriveMate — Booking Update',
      `<h2>Booking Status Update</h2>
       <p>Dear ${booking.user.name},</p>
       <p>Unfortunately your booking for <b>${booking.car.brand} ${booking.car.name}</b> could not be approved.</p>
       <p>Reason: ${booking.adminNote}</p>
       <p>Please contact support if you believe this is an error.</p>
       <p>— DriveMate Team</p>`
    );

    res.status(200).json({ success: true, message: 'Booking rejected.', data: booking });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Cancel Booking (User)
// @route   PUT /api/bookings/:id/cancel
// @access  Private
// -----------------------------------------------------------
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status === 'Cancelled' || booking.status === 'Completed') {
      return res.status(400).json({ message: 'Cannot cancel this booking.' });
    }

    if (booking.status === 'Approved') {
      booking.penaltyApplied = true;
      booking.penaltyAmount = booking.totalPrice * 0.10;
      booking.refundAmount = booking.totalPrice * 0.90;
    } else {
      booking.refundAmount = booking.totalPrice;
    }

    booking.status = 'Cancelled';
    booking.isCancelled = true;
    booking.cancelledAt = new Date();
    await booking.save();

    const car = await Car.findById(booking.car);
    if (car) { car.isAvailable = true; await car.save(); }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled.',
      data: { penaltyApplied: booking.penaltyApplied, penaltyAmount: booking.penaltyAmount, refundAmount: booking.refundAmount },
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Edit Booking Dates (User - Approved only)
// @route   PUT /api/bookings/:id/edit
// @access  Private
// Resets to Pending so Admin re-approves new dates/price
// -----------------------------------------------------------
exports.editBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    // Only the booking owner can edit
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised to edit this booking.' });
    }
    if (booking.status !== 'Approved') {
      return res.status(400).json({ message: 'You can only edit Approved bookings.' });
    }

    const { endDate } = req.body;
    if (!endDate) return res.status(400).json({ message: 'New end date is required.' });

    // Reset price fields so pre-save hook recalculates
    booking.endDate = new Date(endDate);
    booking.basePrice = null;
    booking.totalPrice = null;
    booking.totalDays = null;
    booking.status = 'Pending'; // Back to pending for re-approval
    booking.adminNote = 'Dates updated by user — re-approval required.';

    // Re-make car available since it's no longer confirmed
    await Car.findByIdAndUpdate(booking.car, { isAvailable: true });

    await booking.save();

    res.status(200).json({ success: true, message: 'Booking updated and sent for re-approval.', data: booking });
  } catch (error) {
    next(error);
  }
};
