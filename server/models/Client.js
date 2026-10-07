const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide client name'],
      trim: true,
      minlength: [2, 'Client name must be at least 2 characters long'],
      maxlength: [100, 'Client name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide client email'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Please provide client contact phone'],
      trim: true,
      set: function (v) {
        if (!v) return '';
        return v.replace(/^\+91/, '').replace(/[\s-]/g, '');
      },
      match: [/^[6-9][0-9]{9}$/, 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.'],
    },
    address: {
      type: String,
      required: [true, 'Please provide client address'],
      trim: true,
      minlength: [5, 'Address must be at least 5 characters long'],
      maxlength: [250, 'Address cannot exceed 250 characters'],
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: [50, 'Contact person cannot exceed 50 characters'],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters'],
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters'],
    },
    pincode: {
      type: String,
      trim: true,
      match: [/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit pincode.'],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Client', clientSchema);
