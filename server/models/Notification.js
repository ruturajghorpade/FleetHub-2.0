const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'DELIVERY_CREATED',
        'DELIVERY_ASSIGNED',
        'DELIVERY_ACCEPTED',
        'DELIVERY_DELIVERED',
        'DELIVERY_CANCELLED',
        'DRIVER_REJECTED',
        'NO_DRIVER_AVAILABLE',
        'ASSIGNMENT_FAILED',
        'PICKED_UP',
        'OUT_FOR_DELIVERY',
        'MAINTENANCE_STARTED',
        'MAINTENANCE_COMPLETED',
        'SYSTEM',
      ],
      default: 'SYSTEM',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
