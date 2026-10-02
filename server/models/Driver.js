const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide driver name'],
      trim: true,
      minlength: [2, 'Driver name must be at least 2 characters long'],
      maxlength: [50, 'Driver name cannot exceed 50 characters'],
      match: [/^[A-Za-z][A-Za-z .'-]{1,49}$/, 'Driver name must contain only letters, spaces, dots, hyphens, or apostrophes'],
    },
    phone: {
      type: String,
      required: [true, 'Please provide driver phone number'],
      trim: true,
      match: [/^[6-9][0-9]{9}$/, 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.'],
    },
    licenseNumber: {
      type: String,
      required: [true, 'Please provide driver license number'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [5, 'License number must be at least 5 characters long'],
      maxlength: [30, 'License number cannot exceed 30 characters'],
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ASSIGNED', 'BUSY', 'ON_BREAK', 'OFF_DUTY', 'INACTIVE'],
      default: 'AVAILABLE',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Driver', driverSchema);
