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
      minlength: [2, 'Customer name must be at least 2 characters long'],
      maxlength: [50, 'Customer name cannot exceed 50 characters'],
      match: [/^[A-Za-z][A-Za-z .'-]{1,49}$/, 'Customer name must contain only letters, spaces, dots, hyphens, or apostrophes'],
    },
    customerPhone: {
      type: String,
      required: [true, 'Please provide customer phone number'],
      trim: true,
      set: function (v) {
        if (!v) return '';
        return v.replace(/^\+91/, '').replace(/[\s-]/g, '');
      },
      match: [/^[6-9][0-9]{9}$/, 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.'],
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Please provide delivery address'],
      trim: true,
      minlength: [5, 'Delivery address must be at least 5 characters long'],
      maxlength: [250, 'Delivery address cannot exceed 250 characters'],
    },
    orderItems: {
      type: String,
      default: 'General Food Items',
      trim: true,
      maxlength: [500, 'Order items description cannot exceed 500 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Please provide order amount'],
      min: [0, 'Amount cannot be negative'],
      max: [1000000, 'Amount cannot exceed ₹10,00,000'],
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

// Compound indexes for high-frequency queries (M-06)
deliverySchema.index({ clientId: 1, status: 1 });
deliverySchema.index({ driverId: 1, status: 1 });

// Auto-generate collision-resistant unique orderId if not provided (e.g. FH-8293041928)
deliverySchema.pre('save', async function (next) {
  if (!this.orderId) {
    let unique = false;
    let attempts = 0;
    const DeliveryModel = mongoose.model('Delivery');

    while (!unique && attempts < 5) {
      const ts = Date.now().toString().slice(-6);
      const rand = Math.floor(1000 + Math.random() * 9000);
      const candidate = `FH-${ts}${rand}`;
      const existing = await DeliveryModel.findOne({ orderId: candidate }).lean();
      if (!existing) {
        this.orderId = candidate;
        unique = true;
      }
      attempts++;
    }

    if (!this.orderId) {
      this.orderId = `FH-${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('Delivery', deliverySchema);
