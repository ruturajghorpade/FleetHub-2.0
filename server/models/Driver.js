const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide driver name'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide driver phone number'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'Please provide driver license number'],
      unique: true,
      trim: true,
      uppercase: true,
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
