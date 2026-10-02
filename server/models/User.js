const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
      match: [/^[A-Za-z][A-Za-z .'-]{1,49}$/, 'Name must contain only letters, spaces, dots, hyphens, or apostrophes'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (v) {
          if (!v) return true; // optional
          return /^[6-9][0-9]{9}$/.test(v);
        },
        message: 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.',
      },
    },
    role: {
      type: String,
      enum: {
        values: [
          'SUPER_ADMIN',
          'ADMIN',
          'CLIENT',
          'DRIVER',
          // Legacy backwards compatibility values
          'CLIENT_ADMIN',
          'CLIENT_USER',
          'DISPATCHER',
        ],
        message: '{VALUE} is not a valid FleetHub role',
      },
      default: 'CLIENT',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
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
    // Driver-specific details
    licenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    licenseExpiry: {
      type: Date,
      default: null,
    },
    vehicleType: {
      type: String,
      trim: true,
      default: '',
    },
    vehicleModel: {
      type: String,
      trim: true,
      default: '',
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Enforce rule: Exactly ONE SUPER_ADMIN in the entire system
userSchema.pre('validate', async function (next) {
  if (this.role === 'SUPER_ADMIN') {
    // Platform super admin must not belong to a specific tenant
    this.clientId = null;
    this.branchId = null;

    const count = await mongoose.model('User').countDocuments({
      role: 'SUPER_ADMIN',
      _id: { $ne: this._id },
    });

    if (count >= 1) {
      return next(new Error('A SUPER_ADMIN already exists. Only one SUPER_ADMIN is allowed.'));
    }
  }

  if (this.role === 'ADMIN' || this.role === 'DISPATCHER') {
    this.clientId = null;
    this.branchId = null;
  }

  next();
});

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
