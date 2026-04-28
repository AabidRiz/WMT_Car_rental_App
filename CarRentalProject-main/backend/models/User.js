// =============================================================
// models/User.js
// PURPOSE: Defines the User schema for authentication (Module 1 & 6).
// Both regular users (customers) and admins share this schema.
// The 'role' field distinguishes them throughout the system.
// =============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    // Full name for display and PDF invoices
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      match: [/^[^0-9]+$/, 'Name cannot contain numbers'],
    },

    // Email is the unique login identifier
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please enter a valid email'],
    },

    // Password will be hashed before saving (see pre-save hook below)
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      match: [/(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least 1 uppercase letter and 1 number'],
    },

    // Phone number – used by Emergency SOS module to display to Admin
    phone: {
      type: String,
      trim: true,
    },

    // Avatar image URL
    profilePicture: {
      type: String,
      default: null,
    },

    // 'user' = customer (John), 'admin' = fleet manager
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    // Push notification token (Expo) – used by Module 3 (Timetable) reminders
    pushToken: {
      type: String,
      default: null,
    },
  },
  {
    // Automatically adds createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// -----------------------------------------------------------
// PRE-SAVE HOOK: Hash the password before storing in the DB.
// 'salt rounds = 10' gives a strong balance of security & speed.
// We only hash if the password field was modified (avoids re-hashing
// on every save that doesn't update the password).
// -----------------------------------------------------------
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// -----------------------------------------------------------
// INSTANCE METHOD: Compare a plain-text password against the
// stored hash. Used in authController during login.
// -----------------------------------------------------------
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
