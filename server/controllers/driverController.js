const crypto = require('crypto');
const Driver = require('../models/Driver');
const Branch = require('../models/Branch');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const { isSuperAdmin, isAdmin, isClient, isDriver } = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');
const {
  validateName,
  validateEmail,
  validatePhone,
  validateEnum,
  validateTextLength,
  sanitizeSearchQuery,
  sendValidationError,
} = require('../utils/validation');

/**
 * Generate a secure, unpredictable temporary password that passes strict password validation:
 * - Minimum 8 characters (10 chars generated)
 * - Upper, lower, digit, and special character included
 */
const generateSecureTempPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@$!%*?&';

  const chars = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ];

  const allPool = upper + lower + digits + special;
  for (let i = 0; i < 6; i++) {
    chars.push(allPool[crypto.randomInt(allPool.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

const { getLinkedDriverId } = require('../utils/driverLinker');

// @desc    Get all drivers (tenant isolated, driver gets own profile only)
// @route   GET /api/v1/drivers or GET /api/drivers
// @access  Private (SUPER_ADMIN, ADMIN, DISPATCHER, DRIVER)
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
          { email: { $regex: cleanSearch, $options: 'i' } },
          { phone: { $regex: cleanSearch, $options: 'i' } },
          { licenseNumber: { $regex: cleanSearch, $options: 'i' } },
        ];
      }
    }

    const drivers = await Driver.find(filter)
      .populate('userId', 'email status mustChangePassword role address')
      .populate('clientId', 'name email')
      .populate('branchId', 'name address phone')
      .sort({ createdAt: -1 });

    // Attach active assignment if any
    const driverIds = drivers.map((d) => d._id);
    const activeDeliveries = await Delivery.find({
      driverId: { $in: driverIds },
      status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
    }).select('orderId status driverId customerName deliveryAddress amount');

    const deliveryMap = {};
    activeDeliveries.forEach((ad) => {
      deliveryMap[ad.driverId.toString()] = ad;
    });

    const driversWithDetails = drivers.map((d) => {
      const doc = d.toObject ? d.toObject() : { ...d };
      doc.currentDelivery = deliveryMap[d._id.toString()] || null;
      // Ensure email is always populated
      if (!doc.email && doc.userId?.email) {
        doc.email = doc.userId.email;
      }
      return doc;
    });

    res.status(200).json({
      success: true,
      count: driversWithDetails.length,
      data: driversWithDetails,
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
      .populate('userId', 'email status mustChangePassword role address')
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

    const doc = driver.toObject();
    const activeDelivery = await Delivery.findOne({
      driverId: driver._id,
      status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
    });
    doc.currentDelivery = activeDelivery || null;

    res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create driver (Creates User + Driver profile and generates secure temporary password)
// @route   POST /api/v1/drivers or POST /api/drivers
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.createDriver = async (req, res, next) => {
  try {
    // 1. Strict backend role enforcement: ONLY SUPER_ADMIN and ADMIN
    if (!isSuperAdmin(req.user.role) && !isAdmin(req.user.role)) {
      await recordAuditLog({
        req,
        action: 'UNAUTHORIZED_DRIVER_ACCESS',
        resource: 'Driver',
        details: `${req.user.role} (${req.user.email}) attempted to create a driver account.`,
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create driver accounts.',
      });
    }

    let {
      name,
      email,
      phone,
      licenseNumber,
      licenseExpiryDate,
      licenseExpiry,
      address,
      branchId,
      clientId,
      status,
    } = req.body;

    const errors = {};

    // 2. Comprehensive Validations
    const nameCheck = validateName(name, 'Driver full name', 2, 50);
    if (!nameCheck.isValid) errors.name = nameCheck.error;

    const emailCheck = validateEmail(email, 'Driver email address');
    if (!emailCheck.isValid) errors.email = emailCheck.error;

    const phoneCheck = validatePhone(phone, 'Driver phone number');
    if (!phoneCheck.isValid) errors.phone = phoneCheck.error;

    const licenseCheck = validateTextLength(licenseNumber, 'Driving license number', 5, 30);
    if (!licenseCheck.isValid) errors.licenseNumber = licenseCheck.error;

    const expiryVal = licenseExpiryDate || licenseExpiry;
    if (expiryVal) {
      const parsedDate = new Date(expiryVal);
      if (isNaN(parsedDate.getTime())) {
        errors.licenseExpiryDate = 'License expiry date must be a valid date.';
      }
    }

    const allowedStatuses = ['AVAILABLE', 'OFF_DUTY', 'ON_BREAK', 'INACTIVE'];
    if (status) {
      const statusCheck = validateEnum(status, allowedStatuses, 'Driver status');
      if (!statusCheck.isValid) errors.status = statusCheck.error;
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    const cleanEmail = emailCheck.value.toLowerCase().trim();
    const cleanPhone = phoneCheck.value;
    const formattedLicense = licenseCheck.value.toUpperCase().trim();
    const cleanAddress = (address || '').trim();
    const finalExpiry = expiryVal ? new Date(expiryVal) : null;
    const initialStatus = status || 'AVAILABLE';

    // 3. Duplicate checks
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return sendValidationError(
        res,
        { email: `A user account with email "${cleanEmail}" already exists.` },
        `A user account with email "${cleanEmail}" already exists.`
      );
    }

    const existingPhoneDriver = await Driver.findOne({ phone: cleanPhone });
    const existingPhoneUser = await User.findOne({ phone: cleanPhone });
    if (existingPhoneDriver || existingPhoneUser) {
      return sendValidationError(
        res,
        { phone: `A driver with phone number "${cleanPhone}" already exists.` },
        `A driver with phone number "${cleanPhone}" already exists.`
      );
    }

    const existingLicense = await Driver.findOne({ licenseNumber: formattedLicense });
    if (existingLicense) {
      return sendValidationError(
        res,
        { licenseNumber: `Driver with license number "${formattedLicense}" already exists.` },
        `Driver with license number "${formattedLicense}" already exists.`
      );
    }

    // Resolve client from branch if branchId provided
    if (branchId && !clientId) {
      const branch = await Branch.findById(branchId);
      if (branch) clientId = branch.clientId;
    }

    // 4. Generate secure temporary password
    const temporaryPassword = generateSecureTempPassword();

    // 5. Create User account (role strictly forced to DRIVER)
    const user = await User.create({
      name: nameCheck.value,
      email: cleanEmail,
      phone: cleanPhone,
      password: temporaryPassword, // Hashed by User model pre-save hook
      role: 'DRIVER', // Backend forces role = DRIVER
      status: 'ACTIVE',
      mustChangePassword: true,
      address: cleanAddress,
      licenseNumber: formattedLicense,
      licenseExpiry: finalExpiry,
      clientId: clientId || null,
      branchId: branchId || null,
    });

    // 6. Create Driver profile
    const driver = await Driver.create({
      userId: user._id,
      name: nameCheck.value,
      email: cleanEmail,
      phone: cleanPhone,
      licenseNumber: formattedLicense,
      licenseExpiryDate: finalExpiry,
      address: cleanAddress,
      clientId: clientId || null,
      branchId: branchId || null,
      status: initialStatus,
    });

    // 7. Associate driverId on User account
    user.driverId = driver._id;
    await user.save();

    // 8. Record Audit Log (never log password)
    await recordAuditLog({
      req,
      action: 'CREATE_DRIVER',
      resource: 'Driver',
      resourceId: driver._id,
      details: `Created driver ${driver.name} (${driver.licenseNumber}) with User account ${user.email}`,
    });

    // 9. Return response with temporaryPassword (only shown once to Admin)
    res.status(201).json({
      success: true,
      message: 'Driver created successfully. Please share login credentials securely with the driver.',
      data: {
        driver: {
          id: driver._id,
          _id: driver._id,
          userId: user._id,
          name: driver.name,
          email: user.email,
          phone: driver.phone,
          licenseNumber: driver.licenseNumber,
          licenseExpiryDate: driver.licenseExpiryDate,
          address: driver.address,
          status: driver.status,
          availability: driver.status,
          clientId: driver.clientId,
          branchId: driver.branchId,
        },
        temporaryPassword,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Driver with this email, phone, or license number already exists.',
      });
    }
    next(error);
  }
};

// @desc    Update driver profile details
// @route   PUT /api/v1/drivers/:id or PATCH /api/v1/drivers/:id
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.updateDriver = async (req, res, next) => {
  try {
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
    const driverUpdates = {};
    const userUpdates = {};

    if (req.body.name !== undefined) {
      const nameCheck = validateName(req.body.name, 'Driver name', 2, 50);
      if (!nameCheck.isValid) errors.name = nameCheck.error;
      else {
        driverUpdates.name = nameCheck.value;
        userUpdates.name = nameCheck.value;
      }
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
          driverUpdates.phone = cleanPhone;
          userUpdates.phone = cleanPhone;
        }
      }
    }

    if (req.body.email !== undefined) {
      const emailCheck = validateEmail(req.body.email, 'Driver email');
      if (!emailCheck.isValid) {
        errors.email = emailCheck.error;
      } else {
        const cleanEmail = emailCheck.value;
        const duplicateUser = await User.findOne({
          email: cleanEmail,
          _id: { $ne: driver.userId },
        });
        if (duplicateUser) {
          errors.email = `An account with email "${cleanEmail}" already exists.`;
        } else {
          driverUpdates.email = cleanEmail;
          userUpdates.email = cleanEmail;
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
          driverUpdates.licenseNumber = formattedLicense;
          userUpdates.licenseNumber = formattedLicense;
        }
      }
    }

    if (req.body.licenseExpiryDate !== undefined || req.body.licenseExpiry !== undefined) {
      const expVal = req.body.licenseExpiryDate || req.body.licenseExpiry;
      if (expVal) {
        const parsedDate = new Date(expVal);
        if (isNaN(parsedDate.getTime())) {
          errors.licenseExpiryDate = 'Invalid license expiry date.';
        } else {
          driverUpdates.licenseExpiryDate = parsedDate;
          userUpdates.licenseExpiry = parsedDate;
        }
      }
    }

    if (req.body.address !== undefined) {
      driverUpdates.address = (req.body.address || '').trim();
      userUpdates.address = (req.body.address || '').trim();
    }

    const allowedStatuses = ['AVAILABLE', 'ASSIGNED', 'BUSY', 'ON_BREAK', 'OFF_DUTY', 'INACTIVE'];
    if (req.body.status !== undefined) {
      const statusCheck = validateEnum(req.body.status, allowedStatuses, 'Driver status');
      if (!statusCheck.isValid) errors.status = statusCheck.error;
      else {
        driverUpdates.status = statusCheck.value;
        if (statusCheck.value === 'INACTIVE') userUpdates.status = 'INACTIVE';
        else if (statusCheck.value === 'AVAILABLE') userUpdates.status = 'ACTIVE';
      }
    }

    if (req.body.branchId !== undefined) {
      driverUpdates.branchId = req.body.branchId || null;
      userUpdates.branchId = req.body.branchId || null;
    }
    if (req.body.clientId !== undefined) {
      driverUpdates.clientId = req.body.clientId || null;
      userUpdates.clientId = req.body.clientId || null;
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    if (driverUpdates.branchId && !driverUpdates.clientId) {
      const branch = await Branch.findById(driverUpdates.branchId);
      if (branch) {
        driverUpdates.clientId = branch.clientId;
        userUpdates.clientId = branch.clientId;
      }
    }

    driver = await Driver.findByIdAndUpdate(req.params.id, driverUpdates, {
      new: true,
      runValidators: true,
    })
      .populate('userId', 'email status mustChangePassword role address')
      .populate('clientId', 'name email')
      .populate('branchId', 'name address phone');

    // Update linked User account if exists
    if (driver.userId && Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(driver.userId, userUpdates);
    }

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
        message: 'Driver with this license number, phone, or email already exists.',
      });
    }
    next(error);
  }
};

// @desc    Reset driver credentials and issue temporary password
// @route   POST /api/v1/drivers/:id/reset-password or POST /api/drivers/:id/reset-password
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.resetDriverPassword = async (req, res, next) => {
  try {
    if (!isSuperAdmin(req.user.role) && !isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reset driver credentials.',
      });
    }

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }

    let user = null;
    if (driver.userId) {
      user = await User.findById(driver.userId);
    }
    if (!user) {
      user = await User.findOne({
        role: 'DRIVER',
        $or: [
          { driverId: driver._id },
          { email: driver.email },
          { phone: driver.phone },
          { licenseNumber: driver.licenseNumber },
        ],
      });
    }

    const temporaryPassword = generateSecureTempPassword();

    if (!user) {
      const cleanEmail = driver.email || `${driver.phone.replace(/[^0-9]/g, '')}@fleethub.com`;
      user = await User.create({
        name: driver.name,
        email: cleanEmail,
        phone: driver.phone,
        password: temporaryPassword,
        role: 'DRIVER',
        status: 'ACTIVE',
        driverId: driver._id,
        mustChangePassword: true,
        licenseNumber: driver.licenseNumber,
      });
      driver.userId = user._id;
      driver.email = cleanEmail;
      await driver.save();
    } else {
      user.password = temporaryPassword;
      user.mustChangePassword = true;
      user.status = 'ACTIVE';
      if (!user.driverId) user.driverId = driver._id;
      await user.save();

      if (!driver.userId) {
        driver.userId = user._id;
        if (!driver.email) driver.email = user.email;
        await driver.save();
      }
    }

    await recordAuditLog({
      req,
      action: 'RESET_DRIVER_PASSWORD',
      resource: 'Driver',
      resourceId: driver._id,
      details: `Generated new temporary password for driver ${driver.name} (${user.email})`,
    });

    res.status(200).json({
      success: true,
      message: 'Driver password reset successfully. Please share the temporary password with the driver.',
      data: {
        driver: {
          id: driver._id,
          name: driver.name,
          email: user.email,
        },
        temporaryPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate or Deactivate driver account
// @route   PATCH /api/v1/drivers/:id/status or PATCH /api/drivers/:id/status
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.toggleDriverStatus = async (req, res, next) => {
  try {
    if (!isSuperAdmin(req.user.role) && !isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to modify driver status.',
      });
    }

    const { status } = req.body;
    const allowed = ['ACTIVE', 'INACTIVE', 'AVAILABLE', 'OFF_DUTY', 'ON_BREAK'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowed.join(', ')}`,
      });
    }

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }

    // Active delivery check before deactivating
    if (status === 'INACTIVE' || status === 'OFF_DUTY') {
      const activeDelivery = await Delivery.findOne({
        driverId: driver._id,
        status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
      });
      if (activeDelivery) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate driver while active delivery (${activeDelivery.orderId}) is in progress.`,
        });
      }
    }

    const driverStatus = status === 'ACTIVE' ? 'AVAILABLE' : status;
    driver.status = driverStatus;
    await driver.save();

    // Sync with User status
    const targetUserStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (driver.userId) {
      await User.findByIdAndUpdate(driver.userId, { status: targetUserStatus });
    } else if (driver.email) {
      await User.findOneAndUpdate({ email: driver.email }, { status: targetUserStatus });
    }

    await recordAuditLog({
      req,
      action: status === 'INACTIVE' ? 'DEACTIVATE_DRIVER' : 'ACTIVATE_DRIVER',
      resource: 'Driver',
      resourceId: driver._id,
      details: `Updated driver ${driver.name} status to ${status}`,
    });

    res.status(200).json({
      success: true,
      message: `Driver status updated to ${status}.`,
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver updates their own availability
// @route   PATCH /api/v1/driver/availability or PATCH /api/drivers/availability
// @access  Private (DRIVER, SUPER_ADMIN, ADMIN)
exports.updateAvailability = async (req, res, next) => {
  try {
    const rawStatus = req.body.status || req.body.availability;
    const allowed = ['AVAILABLE', 'ON_BREAK', 'OFF_DUTY'];

    if (!rawStatus || !allowed.includes(rawStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid availability. Must be one of: ${allowed.join(', ')}`,
      });
    }

    let driverId = req.user.driverId;
    if (!driverId && isDriver(req.user.role)) {
      driverId = await getLinkedDriverId(req.user);
    }
    if (!driverId && (isSuperAdmin(req.user.role) || isAdmin(req.user.role))) {
      driverId = req.body.driverId;
    }

    if (!driverId) {
      return res.status(404).json({ success: false, message: 'Driver profile not linked.' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }

    if (driver.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact FleetHub administration.',
      });
    }

    // Check active delivery
    const activeDelivery = await Delivery.findOne({
      driverId: driver._id,
      status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
    });

    if (activeDelivery && rawStatus !== 'BUSY') {
      return res.status(400).json({
        success: false,
        message: `Cannot change availability while active order ${activeDelivery.orderId} is in progress.`,
      });
    }

    driver.status = rawStatus;
    await driver.save();

    await recordAuditLog({
      req,
      action: 'DRIVER_AVAILABILITY_CHANGED',
      resource: 'Driver',
      resourceId: driver._id,
      details: `Driver ${driver.name} changed availability to ${rawStatus}`,
    });

    res.status(200).json({
      success: true,
      message: `Availability updated to ${rawStatus}.`,
      data: {
        id: driver._id,
        _id: driver._id,
        name: driver.name,
        status: driver.status,
        availability: driver.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get authenticated driver profile with active delivery & statistics
// @route   GET /api/v1/driver/profile or GET /api/drivers/profile
// @access  Private (DRIVER)
exports.getDriverProfile = async (req, res, next) => {
  try {
    let driverId = req.user.driverId;
    if (!driverId) {
      driverId = await getLinkedDriverId(req.user);
    }

    if (!driverId) {
      return res.status(404).json({ success: false, message: 'Driver profile not found.' });
    }

    const driver = await Driver.findById(driverId)
      .populate('clientId', 'name email address phone')
      .populate('branchId', 'name address phone');

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver record not found.' });
    }

    const activeDelivery = await Delivery.findOne({
      driverId: driver._id,
      status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
    })
      .populate('clientId', 'name phone address')
      .populate('branchId', 'name address phone')
      .populate('vehicleId', 'vehicleNumber vehicleType model status');

    let assignedVehicle = activeDelivery?.vehicleId || null;

    res.status(200).json({
      success: true,
      data: {
        driver,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          role: req.user.role,
          status: req.user.status,
          mustChangePassword: req.user.mustChangePassword || false,
          address: req.user.address || driver.address || '',
        },
        activeDelivery,
        assignedVehicle,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update driver profile (Driver updating their own allowed fields: phone, address)
// @route   PATCH /api/v1/driver/profile or PATCH /api/driver/profile
// @access  Private (DRIVER, SUPER_ADMIN, ADMIN)
exports.updateDriverProfile = async (req, res, next) => {
  try {
    let driverId = req.user.driverId;
    if (!driverId) {
      driverId = await getLinkedDriverId(req.user);
    }
    if (!driverId) {
      return res.status(404).json({ success: false, message: 'Driver profile not found.' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver record not found.' });
    }

    const driverUpdates = {};
    const userUpdates = {};
    const errors = {};

    if (req.body.phone !== undefined) {
      const cleanPhone = String(req.body.phone).replace(/\D/g, '').slice(-10);
      const phoneCheck = validatePhone(cleanPhone, 'Driver Phone');
      if (!phoneCheck.isValid) {
        errors.phone = phoneCheck.error;
      } else {
        const dupDriver = await Driver.findOne({ phone: cleanPhone, _id: { $ne: driver._id } });
        if (dupDriver) {
          errors.phone = 'Phone number is already in use by another driver.';
        } else {
          driverUpdates.phone = cleanPhone;
          userUpdates.phone = cleanPhone;
        }
      }
    }

    if (req.body.address !== undefined) {
      driverUpdates.address = (req.body.address || '').trim();
      userUpdates.address = (req.body.address || '').trim();
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    Object.assign(driver, driverUpdates);
    await driver.save();

    if (driver.userId && Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(driver.userId, userUpdates);
    }

    await recordAuditLog({
      req,
      action: 'UPDATE_DRIVER_PROFILE',
      resource: 'Driver',
      resourceId: driver._id,
      details: `Driver ${driver.name} updated their contact/address profile`,
    });

    res.status(200).json({
      success: true,
      message: 'Driver profile updated successfully.',
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get deliveries belonging to authenticated driver
// @route   GET /api/v1/driver/deliveries or GET /api/drivers/deliveries
// @access  Private (DRIVER)
exports.getDriverDeliveries = async (req, res, next) => {
  try {
    let driverId = req.user.driverId;
    if (!driverId) {
      driverId = await getLinkedDriverId(req.user);
    }

    if (!driverId) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const filter = { driverId };

    if (req.query.status) {
      if (req.query.status.includes(',')) {
        filter.status = { $in: req.query.status.split(',').map((s) => s.trim()) };
      } else {
        filter.status = req.query.status.trim();
      }
    }

    const deliveries = await Delivery.find(filter)
      .populate('clientId', 'name address phone')
      .populate('branchId', 'name address phone')
      .populate('vehicleId', 'vehicleNumber vehicleType model status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete driver
// @route   DELETE /api/v1/drivers/:id
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.deleteDriver = async (req, res, next) => {
  try {
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

    const relatedDeliveries = await Delivery.find({ driverId: driver._id });

    // Check active deliveries
    const activeDeliveries = relatedDeliveries.filter((d) =>
      ['ASSIGNED', 'DRIVER_ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(d.status)
    );

    if (activeDeliveries.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete driver "${driver.name}". Driver has ${activeDeliveries.length} active in-progress delivery/deliveries. Please complete or reassign active deliveries first.`,
      });
    }

    // Historical deliveries soft-delete
    const historicalDeliveries = relatedDeliveries.filter((d) =>
      ['DELIVERED', 'CANCELLED'].includes(d.status)
    );

    if (historicalDeliveries.length > 0) {
      driver.status = 'INACTIVE';
      await driver.save();

      if (driver.userId) {
        await User.findByIdAndUpdate(driver.userId, { status: 'INACTIVE' });
      }

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

    // Hard Delete
    await driver.deleteOne();

    if (driver.userId) {
      await User.findByIdAndDelete(driver.userId);
    } else {
      await User.deleteOne({
        role: 'DRIVER',
        $or: [
          { phone: driver.phone },
          { email: driver.email },
          ...(driver.licenseNumber ? [{ licenseNumber: driver.licenseNumber }] : []),
        ],
      });
    }

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
