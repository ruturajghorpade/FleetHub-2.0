const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Delivery must belong to a client'],
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Delivery must belong to a branch'],
    },
    customerName: {
      type: String,
      required: [true, 'Please provide customer name'],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Please provide customer phone number'],
      trim: true,
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Please provide delivery address'],
      trim: true,
    },
    orderItems: {
      type: String,
      default: 'General Food Items',
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide order amount'],
      min: [0, 'Amount cannot be negative'],
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    status: {
      type: String,
      enum: [
        'REQUESTED',
        'WAITING_FOR_DRIVER',
        'DRIVER_ASSIGNED',
        'ACCEPTED',
        'PICKED_UP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'DRIVER_REJECTED',
        'ASSIGNMENT_FAILED',
        // Backward compatibility
        'PENDING',
        'ASSIGNED',
      ],
      default: 'REQUESTED',
    },
    deliveryNotes: {
      type: String,
      default: '',
      trim: true,
    },
    cancellationReason: {
      type: String,
      default: '',
      trim: true,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    rejectionCount: {
      type: Number,
      default: 0,
    },
    rejectedBy: [
      {
        driverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Driver',
        },
        driverName: String,
        reason: String,
        rejectedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    assignedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate orderId if not provided (e.g. FH-104829)
deliverySchema.pre('save', function (next) {
  if (!this.orderId) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.orderId = `FH-${randomNum}`;
  }
  next();
});

module.exports = mongoose.model('Delivery', deliverySchema);
