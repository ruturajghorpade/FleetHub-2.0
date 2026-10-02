// Centralized error handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${err.name}: ${err.message}`);
  }

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    return res.status(404).json({ success: false, message });
  }

  // Mongoose duplicate key (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    let message = `Duplicate value entered for ${field}. Please use another value.`;
    if (field === 'email') message = 'An account with this email already exists.';
    if (field === 'vehicleNumber') message = 'Vehicle registration number already exists.';
    if (field === 'licenseNumber') message = 'Driver license number already exists.';
    if (field === 'phone') message = 'Phone number already exists in the system.';
    if (field === 'orderId') message = 'Delivery order ID already exists.';

    return res.status(400).json({
      success: false,
      message,
      errors: { [field]: message },
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = {};
    if (err.errors) {
      Object.keys(err.errors).forEach((key) => {
        errors[key] = err.errors[key].message;
      });
    }
    const message = Object.values(errors)[0] || 'Validation failed';
    return res.status(400).json({
      success: false,
      message,
      errors,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
