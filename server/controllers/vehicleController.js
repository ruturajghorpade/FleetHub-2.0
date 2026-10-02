const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Delivery = require('../models/Delivery');
const { isClient, isDriver, isPlatformAdmin } = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');

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
      filter.$or = [
        { vehicleNumber: { $regex: req.query.search, $options: 'i' } },
        { model: { $regex: req.query.search, $options: 'i' } },
      ];
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

    const { vehicleNumber, vehicleType, model, clientId, branchId, status } = req.body;

    if (!vehicleNumber || !vehicleType || !model) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle number, vehicle type, and model are required.',
      });
    }

    const cleanNum = vehicleNumber.toUpperCase().trim();
    const existing = await Vehicle.findOne({ vehicleNumber: cleanNum });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Vehicle with registration number "${cleanNum}" already exists.`,
      });
    }

    const vehicle = await Vehicle.create({
      vehicleNumber: cleanNum,
      vehicleType,
      model: model.trim(),
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

    if (req.body.vehicleNumber) {
      req.body.vehicleNumber = req.body.vehicleNumber.toUpperCase().trim();
    }

    vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
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
