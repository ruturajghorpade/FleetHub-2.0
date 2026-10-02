const Driver = require('../models/Driver');
const Branch = require('../models/Branch');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const { isPlatformAdmin, isSuperAdmin, isAdmin, isClient, isDriver } = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');
const {
  validateName,
  validatePhone,
  validateEnum,
  validateTextLength,
  sanitizeSearchQuery,
  sendValidationError,
} = require('../utils/validation');

// Helper to find driver linked to a user with role DRIVER
const getLinkedDriverId = async (user) => {
  if (user.role !== 'DRIVER') return null;
  const driver = await Driver.findOne({
    $or: [
      { phone: user.phone },
      { name: user.name },
      ...(user.licenseNumber ? [{ licenseNumber: user.licenseNumber }] : []),
    ],
  });
  return driver ? driver._id : null;
};

// @desc    Get all drivers (tenant isolated, driver gets own profile only)
// @route   GET /api/v1/drivers or GET /api/drivers
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT, DRIVER)
exports.getDrivers = async (req, res, next) => {
  try {
    // Client cannot access FleetHub drivers
    if (isClient(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Clients are not authorized to access FleetHub driver management.',
      });
    }

    const filter = { ...req.tenantFilter };

    // DRIVER can only view their own driver profile
    if (isDriver(req.user.role)) {
      const driverId = await getLinkedDriverId(req.user);
      if (driverId) {
        filter._id = driverId;
      } else {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.branchId) {
      filter.branchId = req.query.branchId;
    }

    if (req.query.search) {
      const cleanSearch = sanitizeSearchQuery(req.query.search);
      if (cleanSearch) {
        filter.$or = [
          { name: { $regex: cleanSearch, $options: 'i' } },
          { phone: { $regex: cleanSearch, $options: 'i' } },
          { licenseNumber: { $regex: cleanSearch, $options: 'i' } },
        ];
      }
    }

    const drivers = await Driver.find(filter)
      .populate('clientId', 'name email')
      .populate('branchId', 'name address phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single driver
// @route   GET /api/v1/drivers/:id or GET /api/drivers/:id
// @access  Private
exports.getDriver = async (req, res, next) => {
  try {
    if (isClient(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Clients are not authorized to view FleetHub driver details.',
      });
    }

    const driver = await Driver.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('branchId', 'name address phone');

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (isDriver(req.user.role)) {
      const driverId = await getLinkedDriverId(req.user);
      if (!driverId || driver._id.toString() !== driverId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view another driver profile' });
      }
    }

    res.status(200).json({
      success: true,
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create driver
// @route   POST /api/v1/drivers or POST /api/drivers
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.createDriver = async (req, res, next) => {
  try {
    // Backend role enforcement: CLIENT and DRIVER are strictly forbidden
    if (!isSuperAdmin(req.user.role) && !isAdmin(req.user.role)) {
      await recordAuditLog({
        req,
        action: 'UNAUTHORIZED_DRIVER_ACCESS',
        resource: 'Driver',
        details: `${req.user.role} (${req.user.email}) attempted to create a driver.`,
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create drivers.',
      });
    }

    let { name, phone, licenseNumber, branchId, clientId, status } = req.body;
    const errors = {};

    const nameCheck = validateName(name, 'Driver name', 2, 50);
    if (!nameCheck.isValid) errors.name = nameCheck.error;

    const phoneCheck = validatePhone(phone, 'Driver phone number');
    if (!phoneCheck.isValid) errors.phone = phoneCheck.error;

    const licenseCheck = validateTextLength(licenseNumber, 'Driving license number', 5, 30);
    if (!licenseCheck.isValid) errors.licenseNumber = licenseCheck.error;

    const allowedStatuses = ['AVAILABLE', 'ASSIGNED', 'BUSY', 'ON_BREAK', 'OFF_DUTY', 'INACTIVE'];
    if (status) {
      const statusCheck = validateEnum(status, allowedStatuses, 'Driver status');
      if (!statusCheck.isValid) errors.status = statusCheck.error;
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    const formattedLicense = licenseCheck.value.toUpperCase();
    const cleanPhone = phoneCheck.value;

    // Check duplicate license number
    const existingLicense = await Driver.findOne({ licenseNumber: formattedLicense });
    if (existingLicense) {
      return sendValidationError(
        res,
        { licenseNumber: `Driver with license number "${formattedLicense}" already exists.` },
        `Driver with license number "${formattedLicense}" already exists.`
      );
    }

    // Check duplicate phone
    const existingPhone = await Driver.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return sendValidationError(
        res,
        { phone: `Driver with phone number "${cleanPhone}" already exists.` },
        `Driver with phone number "${cleanPhone}" already exists.`
      );
    }

    // If branch is provided without explicit clientId, resolve client from branch if available
    if (branchId && !clientId) {
      const branch = await Branch.findById(branchId);
      if (branch) {
        clientId = branch.clientId;
      }
    }

    const driver = await Driver.create({
      name: nameCheck.value,
      phone: cleanPhone,
      licenseNumber: formattedLicense,
      clientId: clientId || null,
      branchId: branchId || null,
      status: status || 'AVAILABLE',
    });

    await recordAuditLog({
      req,
      action: 'CREATE_DRIVER',
      resource: 'Driver',
      resourceId: driver._id,
      details: `Created driver ${driver.name} (${driver.licenseNumber})`,
    });

    const populated = await Driver.findById(driver._id)
      .populate('clientId', 'name email')
      .populate('branchId', 'name address phone');

    res.status(201).json({
      success: true,
      message: 'Driver created successfully.',
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Driver with this license number or phone already exists.',
      });
    }
    next(error);
  }
};

// @desc    Update driver
// @route   PUT /api/v1/drivers/:id or PATCH /api/v1/drivers/:id
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.updateDriver = async (req, res, next) => {
  try {
    // Backend role enforcement: CLIENT and DRIVER are strictly forbidden
    if (!isSuperAdmin(req.user.role) && !isAdmin(req.user.role)) {
      await recordAuditLog({
        req,
        action: 'UNAUTHORIZED_DRIVER_ACCESS',
        resource: 'Driver',
        resourceId: req.params.id,
        details: `${req.user.role} (${req.user.email}) attempted to update driver ${req.params.id}.`,
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update drivers.',
      });
    }

    let driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }

    const errors = {};
    const updates = {};

    if (req.body.name !== undefined) {
      const nameCheck = validateName(req.body.name, 'Driver name', 2, 50);
      if (!nameCheck.isValid) errors.name = nameCheck.error;
      else updates.name = nameCheck.value;
    }

    if (req.body.phone !== undefined) {
      const phoneCheck = validatePhone(req.body.phone, 'Driver phone number');
      if (!phoneCheck.isValid) {
        errors.phone = phoneCheck.error;
      } else {
        const cleanPhone = phoneCheck.value;
        const duplicatePhone = await Driver.findOne({
          phone: cleanPhone,
          _id: { $ne: driver._id },
        });
        if (duplicatePhone) {
          errors.phone = `Driver with phone number "${cleanPhone}" already exists.`;
        } else {
          updates.phone = cleanPhone;
        }
      }
    }

    if (req.body.licenseNumber !== undefined) {
      const licenseCheck = validateTextLength(req.body.licenseNumber, 'Driving license number', 5, 30);
      if (!licenseCheck.isValid) {
        errors.licenseNumber = licenseCheck.error;
      } else {
        const formattedLicense = licenseCheck.value.toUpperCase();
        const duplicateLicense = await Driver.findOne({
          licenseNumber: formattedLicense,
          _id: { $ne: driver._id },
        });
        if (duplicateLicense) {
          errors.licenseNumber = `Driver with license number "${formattedLicense}" already exists.`;
        } else {
          updates.licenseNumber = formattedLicense;
        }
      }
    }

    const allowedStatuses = ['AVAILABLE', 'ASSIGNED', 'BUSY', 'ON_BREAK', 'OFF_DUTY', 'INACTIVE'];
    if (req.body.status !== undefined) {
      const statusCheck = validateEnum(req.body.status, allowedStatuses, 'Driver status');
      if (!statusCheck.isValid) errors.status = statusCheck.error;
      else updates.status = statusCheck.value;
    }

    if (req.body.branchId !== undefined) {
      updates.branchId = req.body.branchId || null;
    }
    if (req.body.clientId !== undefined) {
      updates.clientId = req.body.clientId || null;
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    // If branch is provided without explicit clientId, resolve client from branch
    if (updates.branchId && !updates.clientId) {
      const branch = await Branch.findById(updates.branchId);
      if (branch) {
        updates.clientId = branch.clientId;
      }
    }

    driver = await Driver.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('clientId', 'name email')
      .populate('branchId', 'name address phone');

    await recordAuditLog({
      req,
      action: 'UPDATE_DRIVER',
      resource: 'Driver',
      resourceId: driver._id,
      details: `Updated driver ${driver.name} (Status: ${driver.status})`,
    });

    res.status(200).json({
      success: true,
      message: 'Driver updated successfully.',
      data: driver,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Driver with this license number or phone already exists.',
      });
    }
    next(error);
  }
};

// @desc    Delete driver
// @route   DELETE /api/v1/drivers/:id
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.deleteDriver = async (req, res, next) => {
  try {
    // Backend role enforcement: CLIENT and DRIVER are strictly forbidden
    if (!isSuperAdmin(req.user.role) && !isAdmin(req.user.role)) {
      await recordAuditLog({
        req,
        action: 'UNAUTHORIZED_DRIVER_ACCESS',
        resource: 'Driver',
        resourceId: req.params.id,
        details: `${req.user.role} (${req.user.email}) attempted to delete driver ${req.params.id}.`,
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete drivers.',
      });
    }

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }

    // Inspect references in Deliveries collection
    const relatedDeliveries = await Delivery.find({ driverId: driver._id });

    // Check for active in-progress deliveries
    const activeDeliveries = relatedDeliveries.filter((d) =>
      ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(d.status)
    );

    if (activeDeliveries.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete driver "${driver.name}". Driver has ${activeDeliveries.length} active in-progress delivery/deliveries. Please complete or reassign active deliveries first.`,
      });
    }

    // Check for completed or historical deliveries
    const historicalDeliveries = relatedDeliveries.filter((d) =>
      ['DELIVERED', 'CANCELLED'].includes(d.status)
    );

    if (historicalDeliveries.length > 0) {
      // Soft-delete / Deactivate to protect delivery history
      driver.status = 'INACTIVE';
      await driver.save();

      await recordAuditLog({
        req,
        action: 'DELETE_DRIVER',
        resource: 'Driver',
        resourceId: driver._id,
        details: `Deactivated driver ${driver.name} (${driver.licenseNumber}) and set status to INACTIVE to preserve ${historicalDeliveries.length} historical delivery records.`,
      });

      return res.status(200).json({
        success: true,
        action: 'DEACTIVATED',
        message: `Driver "${driver.name}" has ${historicalDeliveries.length} historical delivery record(s) and has been deactivated (status set to INACTIVE) to preserve delivery history.`,
        data: driver,
      });
    }

    // No historical or active deliveries: perform Hard Delete
    await driver.deleteOne();

    // Clean up any linked DRIVER User account if applicable
    await User.deleteOne({
      role: 'DRIVER',
      $or: [
        { phone: driver.phone },
        ...(driver.licenseNumber ? [{ licenseNumber: driver.licenseNumber }] : []),
      ],
    });

    await recordAuditLog({
      req,
      action: 'DELETE_DRIVER',
      resource: 'Driver',
      resourceId: driver._id,
      details: `Permanently deleted driver ${driver.name} (${driver.licenseNumber}) from MongoDB.`,
    });

    res.status(200).json({
      success: true,
      action: 'DELETED',
      message: `Driver "${driver.name}" deleted successfully from database.`,
    });
  } catch (error) {
    next(error);
  }
};
