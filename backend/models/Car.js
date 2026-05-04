const mongoose = require('mongoose');

const CarSchema = new mongoose.Schema(
  {
    // Display name, e.g. "Toyota Prius 2022"
    name: {
      type: String,
      required: [true, 'Car name is required'],
      trim: true,
    },

    // Brand/make for filtering
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
    },

    // Model year
    year: {
      type: Number,
      required: [true, 'Year is required'],
    },

    // License plate – must be unique per vehicle
    licensePlate: {
      type: String,
      required: [true, 'License plate is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },

    // ------------------------------------------------------------
    // PRICING & FUEL SPECS (key business logic inputs)
    // pricePerDay  → used in Booking price calculation
    // kmPerLiter   → used in Fuel module to compute range remaining
    // tankCapacity → used in Fuel module to compute % full
    // ------------------------------------------------------------
    pricePerDay: {
      type: Number,
      required: [true, 'Price per day is required'],
      min: [0, 'Price cannot be negative'],//validation to prevent negative values
    },

    kmPerLiter: {
      type: Number,
      required: [true, 'Fuel efficiency (km/L) is required'],
      min: [0, 'km/L cannot be negative'],//validation to prevent negative values
    },

    tankCapacity: {
      type: Number, // in litres
      required: [true, 'Tank capacity is required'],
      min: [0, 'Tank capacity cannot be negative'],//validation to prevent negative values
    },
    
    currentFuel: {
      type: Number, // in litres
      default: 0,
      min: [0, 'Fuel cannot be negative']//validation to prevent negative values
    },

    // Odometer reading at the start of the current / last rental
    // Compared against Module 5 checkout reading to detect over-limit driving
    startingOdometer: {
      type: Number,
      default: 0,
    },

    // Agreed rental mileage limit (km). Default 0 means unlimited.
    maxKmAllowed: {
      type: Number,
      default: 0,
    },

    // Extra charge per km if the user exceeds maxKmAllowed (USD)
    extraKmChargePerKm: {
      type: Number,
      default: 0.5,
    },

    // Fuel type label for display (Petrol / Diesel / Hybrid / EV)
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Hybrid', 'Electric'],
      default: 'Petrol',
    },

    // Transmission type for display
    transmission: {
      type: String,
      enum: ['Manual', 'Automatic'],
      default: 'Automatic',
    },

    // Number of passenger seats
    seats: {
      type: Number,
      default: 5,
    },

    // Short marketing description
    description: {
      type: String,
      trim: true,
    },

    // Availability flag – toggled by Admin or auto-cleared on active booking
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // ------------------------------------------------------------
    // IMAGES: Admin MUST upload exactly up to 3 images via Multer.
    // Stored as relative paths, served via /uploads/cars/.
    // ------------------------------------------------------------
    images: {
      type: [String], // array of file paths, e.g. ['uploads/cars/abc.jpg']
      validate: {
        validator: function (arr) {
          return arr.length >= 1 && arr.length <= 3;
        },
        message: 'Between 1 and 3 images are required',
      },
    },

    // Who added this car (Admin user reference)
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Car', CarSchema);
