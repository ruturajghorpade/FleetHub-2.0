const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide branch name'],
      trim: true,
      minlength: [2, 'Branch name must be at least 2 characters long'],
      maxlength: [100, 'Branch name cannot exceed 100 characters'],
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Branch must belong to a client'],
    },
    address: {
      type: String,
      required: [true, 'Please provide branch address'],
      trim: true,
      minlength: [5, 'Branch address must be at least 5 characters long'],
      maxlength: [250, 'Branch address cannot exceed 250 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Please provide branch phone number'],
      trim: true,
      match: [/^[6-9][0-9]{9}$/, 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.'],
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

module.exports = mongoose.model('Branch', branchSchema);
