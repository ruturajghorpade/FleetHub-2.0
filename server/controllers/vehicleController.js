const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Delivery = require('../models/Delivery');
const { isClient, isDriver, isPlatformAdmin } = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');
const {
  validateVehicleNumber,
  validateEnum,
  validateTextLength,
  validateNumber,
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

// @desc    Get all vehicles (FleetHub resources)
// @route   GET /api/v1/vehicles or GET /api/vehicles
// @access  Private (SUPER_ADMIN, ADMIN, DISPATCHER, DRIVER)
exports.getVehicles = async (req, res, next) => {
  try {
    // Clients cannot access FleetHub vehicles
    if (isClient(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Clients are not authorized to access FleetHub vehicle management.',
      });
    }

    const filter = { ...req.tenantFilter };

    // DRIVER can only view their assigned vehicle
    if (isDriver(req.user.role)) {
      const driverId = await getLinkedDriverId(req.user);
      if (driverId) {
        // Find if driver has an active delivery with an assigned vehicle
        const activeDelivery = await Delivery.findOne({
          driverId,
          status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
        });

        if (activeDelivery && activeDelivery.vehicleId) {
          filter._id = activeDelivery.vehicleId;
        } else {
          const recentDelivery = await Delivery.findOne({ driverId }).sort({ createdAt: -1 });
          if (recentDelivery && recentDelivery.vehicleId) {
            filter._id = recentDelivery.vehicleId;
          } else {
            return res.status(200).json({
              success: true,
              count: 0,
              data: [],
            });
          }
        }
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
          { vehicleNumber: { $regex: cleanSearch, $options: 'i' } },
          { model: { $regex: cleanSearch, $options: 'i' } },
        ];
      }
    }

    const vehicles = await Vehicle.find(filter)
      .populate('clientId', 'name email')
      .populate('branchId', 'name address phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vehicle
// @route   GET /api/v1/vehicles/:id or GET /api/vehicles/:id
// @access  Private
exports.getVehicle = async (req, res, next) => {
  try {
    if (isClient(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Clients are not authorized to view FleetHub vehicle details.',
      });
    }

    const vehicle = await Vehicle.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('branchId', 'name address phone');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create vehicle
// @route   POST /api/v1/vehicles or POST /api/vehicles
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.createVehicle = async (req, res, next) => {
  try {
    if (isClient(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Clients are not authorized to create vehicles.',
      });
    }

    const { vehicleNumber, vehicleType, model, capacity, clientId, branchId, status } = req.body;
    const errors = {};

    const numCheck = validateVehicleNumber(vehicleNumber, 'Vehicle registration number');
    if (!numCheck.isValid) errors.vehicleNumber = numCheck.error;

    const allowedTypes = ['BIKE', 'SCOOTER', 'CAR', 'VAN'];
    const typeCheck = validateEnum(vehicleType, allowedTypes, 'Vehicle type');
    if (!typeCheck.isValid) errors.vehicleType = typeCheck.error;

    const modelCheck = validateTextLength(model, 'Vehicle model', 2, 50);
    if (!modelCheck.isValid) errors.model = modelCheck.error;

    if (capacity !== undefined && capacity !== null && capacity !== '') {
      const capCheck = validateNumber(capacity, 'Vehicle capacity', { min: 1, allowDecimal: false });
      if (!capCheck.isValid) errors.capacity = capCheck.error;
    }

    const allowedStatuses = ['AVAILABLE', 'ASSIGNED', 'IN_USE', 'MAINTENANCE', 'INACTIVE'];
    if (status) {
      const statusCheck = validateEnum(status, allowedStatuses, 'Vehicle status');
      if (!statusCheck.isValid) errors.status = statusCheck.error;
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    const cleanNum = numCheck.value;
    const existing = await Vehicle.findOne({ vehicleNumber: cleanNum });
    if (existing) {
      return sendValidationError(
        res,
        { vehicleNumber: `Vehicle with registration number "${cleanNum}" already exists.` },
        `Vehicle with registration number "${cleanNum}" already exists.`
      );
    }

    const vehicle = await Vehicle.create({
      vehicleNumber: cleanNum,
      vehicleType,
      model: modelCheck.value,
      capacity: capacity ? Number(capacity) : 1,
      clientId: clientId || null,
      branchId: branchId || null,
      status: status || 'AVAILABLE',
    });

    await recordAuditLog({
      req,
      action: 'Vehicle created',
      resource: 'Vehicle',
      resourceId: vehicle._id,
      details: `Created vehicle ${vehicle.vehicleNumber} (${vehicle.model})`,
    });

    const populated = await Vehicle.findById(vehicle._id)
      .populate('clientId', 'name email')
      .populate('branchId', 'name address');

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vehicle
// @route   PUT /api/v1/vehicles/:id or PUT /api/vehicles/:id
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.updateVehicle = async (req, res, next) => {
  try {
    if (isClient(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Clients are not authorized to update vehicles.',
      });
    }

    let vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const errors = {};
    const updates = {};

    if (req.body.vehicleNumber !== undefined) {
      const numCheck = validateVehicleNumber(req.body.vehicleNumber, 'Vehicle registration number');
      if (!numCheck.isValid) {
        errors.vehicleNumber = numCheck.error;
      } else {
        const cleanNum = numCheck.value;
        const duplicate = await Vehicle.findOne({
          vehicleNumber: cleanNum,
          _id: { $ne: vehicle._id },
        });
        if (duplicate) {
          errors.vehicleNumber = `Vehicle with registration number "${cleanNum}" already exists.`;
        } else {
          updates.vehicleNumber = cleanNum;
        }
      }
    }

    if (req.body.vehicleType !== undefined) {
      const allowedTypes = ['BIKE', 'SCOOTER', 'CAR', 'VAN'];
      const typeCheck = validateEnum(req.body.vehicleType, allowedTypes, 'Vehicle type');
      if (!typeCheck.isValid) errors.vehicleType = typeCheck.error;
      else updates.vehicleType = req.body.vehicleType;
    }

    if (req.body.model !== undefined) {
      const modelCheck = validateTextLength(req.body.model, 'Vehicle model', 2, 50);
      if (!modelCheck.isValid) errors.model = modelCheck.error;
      else updates.model = modelCheck.value;
    }

    if (req.body.capacity !== undefined && req.body.capacity !== null && req.body.capacity !== '') {
      const capCheck = validateNumber(req.body.capacity, 'Vehicle capacity', { min: 1, allowDecimal: false });
      if (!capCheck.isValid) errors.capacity = capCheck.error;
      else updates.capacity = Number(req.body.capacity);
    }

    if (req.body.status !== undefined) {
      const allowedStatuses = ['AVAILABLE', 'ASSIGNED', 'IN_USE', 'MAINTENANCE', 'INACTIVE'];
      const statusCheck = validateEnum(req.body.status, allowedStatuses, 'Vehicle status');
      if (!statusCheck.isValid) errors.status = statusCheck.error;
      else updates.status = req.body.status;
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

    vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('clientId', 'name email')
      .populate('branchId', 'name address');

    await recordAuditLog({
      req,
      action: 'Vehicle updated',
      resource: 'Vehicle',
      resourceId: vehicle._id,
      details: `Updated vehicle ${vehicle.vehicleNumber} (Status: ${vehicle.status})`,
    });

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully.',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/v1/vehicles/:id or DELETE /api/vehicles/:id
// @access  Private (SUPER_ADMIN, ADMIN only)
exports.deleteVehicle = async (req, res, next) => {
  try {
    if (isClient(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Clients are not authorized to delete vehicles.',
      });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Check active deliveries
    const activeDelivery = await Delivery.findOne({
      vehicleId: vehicle._id,
      status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
    });

    if (activeDelivery) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete vehicle "${vehicle.vehicleNumber}". It is currently assigned to an active delivery.`,
      });
    }

    await vehicle.deleteOne();

    await recordAuditLog({
      req,
      action: 'Vehicle deleted',
      resource: 'Vehicle',
      resourceId: vehicle._id,
      details: `Deleted vehicle ${vehicle.vehicleNumber}`,
    });

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
