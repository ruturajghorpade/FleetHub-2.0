const User = require('../models/User');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Get all Admin accounts (Platform Operations Admins)
// @route   GET /api/v1/admins or GET /api/admins
// @access  Private (SUPER_ADMIN only)
exports.getAdmins = async (req, res, next) => {
  try {
    const filter = { role: 'ADMIN' };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const admins = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single Admin account
// @route   GET /api/v1/admins/:id or GET /api/admins/:id
// @access  Private (SUPER_ADMIN only)
exports.getAdmin = async (req, res, next) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'ADMIN' }).select('-password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found',
      });
    }

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Admin user
// @route   POST /api/v1/admins or POST /api/admins
// @access  Private (SUPER_ADMIN only)
exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, password, confirmPassword, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    // Role is strictly forced to ADMIN - SUPER_ADMIN cannot create another SUPER_ADMIN
    const newAdmin = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      password,
      role: 'ADMIN',
      status: status || 'ACTIVE',
      clientId: null,
      branchId: null,
    });

    await recordAuditLog({
      req,
      action: 'Admin created',
      resource: 'User',
      resourceId: newAdmin._id,
      details: `Created Admin account: ${newAdmin.name} (${newAdmin.email})`,
    });

    const responseData = {
      _id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      phone: newAdmin.phone,
      role: newAdmin.role,
      status: newAdmin.status,
      createdAt: newAdmin.createdAt,
      updatedAt: newAdmin.updatedAt,
    };

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Admin user details
// @route   PUT /api/v1/admins/:id or PUT /api/admins/:id
// @access  Private (SUPER_ADMIN only)
exports.updateAdmin = async (req, res, next) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'ADMIN' });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found',
      });
    }

    const { name, email, phone, status } = req.body;

    if (name) admin.name = name.trim();
    if (phone !== undefined) admin.phone = phone.trim();
    if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      admin.status = status;
    }

    if (email && email.toLowerCase().trim() !== admin.email) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: cleanEmail });
      if (existing && existing._id.toString() !== admin._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use by another user',
        });
      }
      admin.email = cleanEmail;
    }

    // Explicitly maintain role as ADMIN
    admin.role = 'ADMIN';
    admin.clientId = null;
    admin.branchId = null;

    await admin.save();

    await recordAuditLog({
      req,
      action: 'Admin updated',
      resource: 'User',
      resourceId: admin._id,
      details: `Updated Admin account: ${admin.name} (${admin.email})`,
    });

    const updated = await User.findById(admin._id).select('-password');

    res.status(200).json({
      success: true,
      message: 'Admin account updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Admin user status (activate / deactivate)
// @route   PATCH /api/v1/admins/:id/status or PATCH /api/admins/:id/status
// @access  Private (SUPER_ADMIN only)
exports.updateAdminStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED.',
      });
    }

    const admin = await User.findOne({ _id: req.params.id, role: 'ADMIN' });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found',
      });
    }

    admin.status = status;
    await admin.save();

    const actionText = status === 'ACTIVE' ? 'Admin activated' : 'Admin deactivated';

    await recordAuditLog({
      req,
      action: actionText,
      resource: 'User',
      resourceId: admin._id,
      details: `Status changed to ${status} for Admin: ${admin.email}`,
    });

    res.status(200).json({
      success: true,
      message: `Admin account has been ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Admin password
// @route   PATCH /api/v1/admins/:id/password or PATCH /api/admins/:id/password
// @access  Private (SUPER_ADMIN only)
exports.resetAdminPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    const admin = await User.findOne({ _id: req.params.id, role: 'ADMIN' });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found',
      });
    }

    admin.password = newPassword;
    await admin.save();

    await recordAuditLog({
      req,
      action: 'Admin password reset',
      resource: 'User',
      resourceId: admin._id,
      details: `Password reset for Admin: ${admin.email}`,
    });

    res.status(200).json({
      success: true,
      message: 'Admin password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Admin user
// @route   DELETE /api/v1/admins/:id or DELETE /api/admins/:id
// @access  Private (SUPER_ADMIN only)
exports.deleteAdmin = async (req, res, next) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'ADMIN' });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found',
      });
    }

    await admin.deleteOne();

    await recordAuditLog({
      req,
      action: 'Admin deleted',
      resource: 'User',
      resourceId: admin._id,
      details: `Deleted Admin: ${admin.name} (${admin.email})`,
    });

    res.status(200).json({
      success: true,
      message: 'Admin user deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
