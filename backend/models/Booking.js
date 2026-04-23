// =============================================================
// models/Booking.js
// PURPOSE: Core booking document (Module 1 - Aabid).
// Links a User to a Car for a date range.
// Drives: Price calculation, cancellation penalty, PDF invoice.
// FuelLog and Checkout documents reference a Booking._id.
// =============================================================

const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    // ----- Relationships -----
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },

    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car',
      required: [true, 'Car reference is required'],
    },

    // ----- Rental Dates -----
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },

    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },

    // Calculated and stored for display / PDF (in days, integer)
    totalDays: {
      type: Number,
    },

    // ----- Pricing -----
    // Base price = Car.pricePerDay × totalDays (stored in USD)
    basePrice: {
      type: Number,
    },

    // Extra add-ons selected at booking time (e.g., GPS, child seat)
    addOns: [
      {
        name: String,   // e.g. "GPS Rental"
        price: Number,  // e.g. 10
      },
    ],

    // Sum of addOns prices
    addOnsTotal: {
      type: Number,
      default: 0,
    },

    // Grand total = basePrice + addOnsTotal (before any refund)
    totalPrice: {
      type: Number,
    },

    // ----- Payment -----
    paymentMethod: {
      type: String,
      enum: ['BankTransfer', 'Card', 'Cash'],
      default: 'BankTransfer',
    },

    // Path to the uploaded bank transfer receipt image (Multer – Module 1)
    paymentReceiptImage: {
      type: String, // e.g. 'uploads/receipts/receipt_xyz.jpg'
    },

    // ----- Booking Lifecycle Status -----
    // Pending  → Admin reviews receipt
    // Approved → Admin confirms payment
    // Active   → Car is currently with the user
    // Completed → Checkout done
    // Cancelled → User or Admin cancelled
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Active', 'Completed', 'Cancelled'],
      default: 'Pending',
    },

    // Admin note when approving or rejecting
    adminNote: {
      type: String,
      trim: true,
    },

    // ----- Cancellation & Penalty Logic -----
    // If an Approved booking is cancelled, a 10% penalty applies.
    // Penalty amount = totalPrice × 0.10
    // Refund amount  = totalPrice × 0.90
    // These are computed in the bookingController and stored here for records.
    isCancelled: {
      type: Boolean,
      default: false,
    },

    cancelledAt: {
      type: Date,
    },

    // Penalty applied only when status was 'Approved' before cancellation
    penaltyApplied: {
      type: Boolean,
      default: false,
    },

    penaltyAmount: {
      type: Number,
      default: 0,
    },

    refundAmount: {
      type: Number,
      default: 0,
    },

    // ----- PDF Invoice -----
    // Path to the generated PDF invoice file (pdfkit)
    invoicePdfPath: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// -----------------------------------------------------------
// PRE-SAVE HOOK: Automatically calculate totalDays, basePrice,
// addOnsTotal, and totalPrice whenever the document is saved
// and the dates are present. This keeps the math DRY.
// -----------------------------------------------------------
BookingSchema.pre('save', async function () {
  if (this.startDate && this.endDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    this.totalDays = Math.ceil((this.endDate - this.startDate) / msPerDay);

    if (!this.basePrice && this.car) {
      const Car = mongoose.model('Car');
      const car = await Car.findById(this.car);
      if (car) this.basePrice = car.pricePerDay * this.totalDays;
    }

    if (this.addOns && this.addOns.length > 0) {
      this.addOnsTotal = this.addOns.reduce((sum, a) => sum + a.price, 0);
    }

    this.totalPrice = (this.basePrice || 0) + (this.addOnsTotal || 0);
  }
});

module.exports = mongoose.model('Booking', BookingSchema);
