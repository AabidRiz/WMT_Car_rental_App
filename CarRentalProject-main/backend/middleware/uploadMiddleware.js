// =============================================================
// middleware/uploadMiddleware.js
// PURPOSE: Centralised Multer configuration for ALL modules.
// Each module gets its own upload instance that saves files to
// a dedicated subfolder inside /uploads/.
//
// VIVA EXPLANATION:
//   Multer is a Node.js middleware for handling multipart/form-data
//   (the encoding type used for file uploads in HTML forms and
//   React Native's FormData).
//   diskStorage lets us control the destination folder and filename.
//   We rename each file using Date.now() to guarantee uniqueness
//   and avoid collisions when two users upload files at the same time.
//
// HOW TO USE IN ROUTES:
//   const { uploadCarImages } = require('../middleware/uploadMiddleware');
//   router.post('/add', protect, uploadCarImages.array('images', 3), controller);
// =============================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// -----------------------------------------------------------
// HELPER: createStorage
// Creates a Multer DiskStorage engine for a specific subfolder.
// The uploads directory and the subfolder are created automatically
// if they don't already exist (avoids runtime crashes on first run).
// -----------------------------------------------------------
const createStorage = (subfolder) => {
  const uploadDir = path.join(__dirname, '..', 'uploads', subfolder);

  // Create directory recursively if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return multer.diskStorage({
    // Where to save the file
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },

    // Unique filename: <fieldname>-<timestamp>.<original_extension>
    // e.g. images-1712345678901.jpg
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${file.fieldname}-${Date.now()}${ext}`;
      cb(null, uniqueName);
    },
  });
};

// -----------------------------------------------------------
// FILE FILTER: Only allow image files (jpg, jpeg, png, webp).
// Rejects non-image uploads with a descriptive error.
// -----------------------------------------------------------
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extName = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    cb(null, true); // Accept file
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed!'));
  }
};

// -----------------------------------------------------------
// MODULE-SPECIFIC UPLOAD INSTANCES
// Each module has its own multer instance pointing to its folder.
// Max file size is set to 5MB per file.
// -----------------------------------------------------------

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// MODULE 6 (Admin) – Car images (up to 3)
const uploadCarImages = multer({
  storage: createStorage('cars'),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_SIZE },
});

// MODULE 1 (Booking) – Bank transfer receipt
const uploadPaymentReceipt = multer({
  storage: createStorage('receipts'),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_SIZE },
});

// MODULE 2 (Destination) – Destination cover photo
const uploadDestinationPhoto = multer({
  storage: createStorage('destinations'),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_SIZE },
});

// MODULE 3 (Timetable) – Safari/entry ticket photo
const uploadTicketPhoto = multer({
  storage: createStorage('tickets'),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_SIZE },
});

// MODULE 4 (Fuel) – Gas station receipt photo
const uploadFuelReceipt = multer({
  storage: createStorage('fuel'),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_SIZE },
});

// MODULE 6 (SOS) – Car damage photo
const uploadDamagePhoto = multer({
  storage: createStorage('sos'),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_SIZE },
});

// MODULE 5 (Checkout) – Dashboard odometer photo
const uploadOdometerPhoto = multer({
  storage: createStorage('checkout'),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_SIZE },
});

module.exports = {
  uploadCarImages,
  uploadPaymentReceipt,
  uploadDestinationPhoto,
  uploadTicketPhoto,
  uploadFuelReceipt,
  uploadDamagePhoto,
  uploadOdometerPhoto,
};
