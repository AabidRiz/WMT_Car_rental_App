// =============================================================
// controllers/sosController.js
// PURPOSE: Module 6 - Emergency & Accidents (Ekanayake).
// Saves GPS coords immediately, then allows submitting an
// accident report with damage photo + PDF generation.
// =============================================================

const SOSAlert = require('../models/SOSAlert');
const Booking = require('../models/Booking');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------
// @desc    Trigger SOS & Alert Admin (saves GPS)
// @route   POST /api/sos
// @access  Private (User)
// VIVA EXPLANATION:
// The frontend calls `Linking.openURL('tel:119')` right before calling
// this route. This route saves the precise GPS coordinates so Admin
// can send help.
// -----------------------------------------------------------
exports.triggerSOS = async (req, res, next) => {
  try {
    const { bookingId, lat, lng, emergencyType, description, locationDescription } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'GPS coordinates (lat/lng) are required.' });
    }

    const alert = await SOSAlert.create({
      user: req.user._id,
      booking: bookingId || null,
      location: { lat, lng },
      emergencyType: emergencyType || 'Other',
      description,
      locationDescription,
      adminAlerted: true, // Simulated push/email dispatch
      priority: (emergencyType === 'Accident' || emergencyType === 'Medical') ? 'High' : 'Medium'
    });

    res.status(201).json({
      success: true,
      message: 'SOS Alert triggered. Admin has been notified of your location.',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Submit Post-Accident Report (Photo + PDF Gen)
// @route   PUT /api/sos/:id/report
// @access  Private (User)
// VIVA EXPLANATION:
// Once the user is safe, they snap a picture of the damage.
// This route saves the photo, generates a formal PDF Accident Report,
// and saves the PDF path to the DB.
// -----------------------------------------------------------
exports.submitAccidentReport = async (req, res, next) => {
  try {
    const { damageDescription } = req.body;
    const alertId = req.params.id;

    const alert = await SOSAlert.findOne({ _id: alertId, user: req.user._id }).populate('user', 'name phone');
    if (!alert) {
      return res.status(404).json({ message: 'SOS Alert not found.' });
    }

    // Damage photos from Multer
    const imagePaths = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const relativePath = file.path.split('uploads')[1].replace(/\\/g, '/');
        imagePaths.push(`uploads${relativePath}`);
      });
    } else {
      return res.status(400).json({ message: 'At least one damage photo is required.' });
    }

    alert.damageDescription = damageDescription;
    alert.photos = imagePaths;
    if (alert.emergencyType === 'Accident') alert.priority = 'High';

    // =============== PDF GENERATION (PDFKIT) ===============
    const pdfDir = path.join(__dirname, '..', 'uploads', 'reports');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const pdfFilename = `AccidentReport-${alert._id}.pdf`;
    const pdfPathAbs = path.join(pdfDir, pdfFilename);
    const pdfPathRel = `uploads/reports/${pdfFilename}`;

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(pdfPathAbs);
    doc.pipe(writeStream);

    // Header
    doc.fillColor('#B91C1C').fontSize(24).text('OFFICIAL ACCIDENT REPORT', { align: 'center' }).moveDown();
    
    // Details
    doc.fillColor('black').fontSize(12);
    doc.text(`Report ID: ${alert._id}`);
    doc.text(`Date & Time: ${new Date(alert.createdAt).toLocaleString()}`);
    doc.text(`Customer: ${alert.user.name} (Ph: ${alert.user.phone || 'N/A'})`);
    doc.text(`Emergency Type: ${alert.emergencyType}`);
    doc.moveDown();
    
    doc.fontSize(14).text('Location Elements', { underline: true }).moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Coordinates: Lat: ${alert.location.lat}, Lng: ${alert.location.lng}`);
    doc.text(`Description: ${alert.locationDescription || 'N/A'}`);
    doc.moveDown();

    doc.fontSize(14).text('Damage Description', { underline: true }).moveDown(0.5);
    doc.fontSize(12);
    doc.text(damageDescription || 'No description provided by user.');

    doc.end();

    writeStream.on('finish', async () => {
      alert.accidentReportPdfPath = pdfPathRel;
      await alert.save();

      res.status(200).json({
        success: true,
        message: 'Accident report submitted and PDF generated.',
        data: alert,
      });
    });

  } catch (error) {
    next(error);
  }
};

// -----------------------------------------------------------
// @desc    Admin: Review and Set Damage Penalty Cost
// @route   PUT /api/sos/:id/admin-resolve
// @access  Private (Admin)
// -----------------------------------------------------------
exports.resolveSOS = async (req, res, next) => {
  try {
    const { estimatedDamageCost, adminNote } = req.body;

    const alert = await SOSAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });

    alert.resolvedByAdmin = true;
    alert.adminNote = adminNote;
    if (estimatedDamageCost) {
      alert.estimatedDamageCost = parseFloat(estimatedDamageCost);
    }

    await alert.save();

    res.status(200).json({ success: true, message: 'SOS Alert resolved by Admin.', data: alert });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All SOS (Admin)
exports.getAllSOS = async (req, res, next) => {
  try {
    const alerts = await SOSAlert.find()
      .populate('user', 'name phone email')
      .populate('booking')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get My SOS (User)
exports.getMySOS = async (req, res, next) => {
  try {
    const alerts = await SOSAlert.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to SOS (Admin)
exports.replyToSOS = async (req, res, next) => {
  try {
    const { adminReply } = req.body;
    const alert = await SOSAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });

    alert.adminReply = adminReply;
    alert.repliedAt = new Date();
    await alert.save();

    res.status(200).json({ success: true, message: 'Reply sent.', data: alert });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete SOS Report (Admin or User)
exports.deleteSOS = async (req, res, next) => {
  try {
    const alert = await SOSAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });

    // Users can only delete their own
    if (req.user.role !== 'admin' && alert.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised to delete this report.' });
    }

    await SOSAlert.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Report deleted.' });
  } catch (error) {
    next(error);
  }
};
