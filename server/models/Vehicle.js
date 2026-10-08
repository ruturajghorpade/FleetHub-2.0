const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Please provide vehicle registration number'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [5, 'Vehicle registration number must be at least 5 characters long'],
      maxlength: [20, 'Vehicle registration number cannot exceed 20 characters'],
    },
    vehicleType: {
      type: String,
      enum: {
        values: ['BIKE', 'SCOOTER', 'CAR', 'VAN'],
        message: '{VALUE} is not a valid vehicle type',
      },
      required: [true, 'Please specify vehicle type'],
    },
    model: {
      type: String,
      required: [true, 'Please provide vehicle model'],
      trim: true,
      minlength: [2, 'Vehicle model must be at least 2 characters long'],
      maxlength: [50, 'Vehicle model cannot exceed 50 characters'],
    },
    capacity: {
      type: Number,
      min: [1, 'Vehicle capacity must be greater than zero'],
      default: 1,
    },
    // FleetHub platform resource: clientId and branchId indicate optional current stationing, never exclusive ownership
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
      enum: ['AVAILABLE', 'ASSIGNED', 'IN_USE', 'MAINTENANCE', 'INACTIVE'],
      default: 'AVAILABLE',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
