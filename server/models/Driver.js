const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Please provide driver name'],
      trim: true,
      minlength: [2, 'Driver name must be at least 2 characters long'],
      maxlength: [50, 'Driver name cannot exceed 50 characters'],
      match: [/^[A-Za-z][A-Za-z .'-]{1,49}$/, 'Driver name must contain only letters, spaces, dots, hyphens, or apostrophes'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Please provide driver phone number'],
      trim: true,
      set: function (v) {
        if (!v) return '';
        return v.replace(/^\+91/, '').replace(/[\s-]/g, '');
      },
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
    licenseExpiryDate: {
      type: Date,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    // FleetHub platform resource: clientId and branchId indicate current optional stationing
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property availability maps directly to status
driverSchema
  .virtual('availability')
  .get(function () {
    return this.status;
  })
  .set(function (val) {
    this.status = val;
  });

module.exports = mongoose.model('Driver', driverSchema);
