const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide invited user email'],
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['CLIENT_ADMIN', 'CLIENT_USER', 'DISPATCHER', 'DRIVER'],
      required: [true, 'Please specify role for the invitation'],
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Invitation must be linked to a client organization'],
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days validity
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly query pending invitations
invitationSchema.index({ token: 1, status: 1 });
invitationSchema.index({ email: 1, clientId: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
