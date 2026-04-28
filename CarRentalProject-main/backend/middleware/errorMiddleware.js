// =============================================================
// middleware/errorMiddleware.js
// PURPOSE: Global Express error handling middleware.
// Express identifies this as an error handler because it has
// FOUR parameters: (err, req, res, next).
//
// HOW IT WORKS:
//   When any controller calls next(error) or throws inside an
//   async wrapper, Express skips normal middleware and runs this.
//   We map specific error types (validation, cast, duplicate key)
//   to user-friendly HTTP responses.
// =============================================================

const errorMiddleware = (err, req, res, next) => {
  // Default to 500 Internal Server Error unless a status was set
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // -----------------------------------------------------------
  // Mongoose: CastError
  // Happens when an invalid ObjectId is passed (e.g., /api/cars/abc)
  // Map to 404 Not Found.
  // -----------------------------------------------------------
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found. Invalid ID: ${err.value}`;
  }

  // -----------------------------------------------------------
  // Mongoose: ValidationError
  // Happens when a required field is missing or enum value is wrong.
  // Extract all validation messages and join them.
  // -----------------------------------------------------------
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // -----------------------------------------------------------
  // MongoDB: Duplicate Key Error (code 11000)
  // Happens when a unique constraint is violated
  // (e.g., same email registered twice).
  // -----------------------------------------------------------
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}. Please use a different value.`;
  }

  // -----------------------------------------------------------
  // JWT: JsonWebTokenError
  // Token format is invalid.
  // -----------------------------------------------------------
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }

  // -----------------------------------------------------------
  // JWT: TokenExpiredError
  // Token has passed its expiry time.
  // -----------------------------------------------------------
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please log in again.';
  }

  // -----------------------------------------------------------
  // Multer errors (file size, wrong type)
  // -----------------------------------------------------------
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = `File upload error: ${err.message}`;
  }

  // Log the full error to the server console for debugging
  // (Only shows in development – in production, use a logger like Winston)
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${statusCode} - ${message}`);
    if (err.stack) console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Only expose the stack trace in development mode
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
