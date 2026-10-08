const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle is required for maintenance record'],
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    description: {
      type: String,
      required: [true, 'Please describe the maintenance issue/work'],
      trim: true,
      minlength: [5, 'Maintenance description must be at least 5 characters long'],
      maxlength: [250, 'Maintenance description cannot exceed 250 characters'],
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'IN_PROGRESS',
    },
    cost: {
      type: Number,
      default: 0,
      min: [0, 'Cost cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Maintenance', maintenanceSchema);
