const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');
const { createNotification } = require('../utils/notificationHelper');
const { isClient } = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');
const {
  validateTextLength,
  validateAmount,
  sendValidationError,
} = require('../utils/validation');

// @desc    Get all maintenance records (tenant isolated)
// @route   GET /api/v1/maintenance or GET /api/maintenance
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.getMaintenances = async (req, res, next) => {
  try {
    const filter = { ...req.tenantFilter };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.vehicleId) {
      filter.vehicleId = req.query.vehicleId;
    }

    const maintenances = await Maintenance.find(filter)
      .populate('vehicleId', 'vehicleNumber vehicleType model status')
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: maintenances.length,
      data: maintenances,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single maintenance record
// @route   GET /api/v1/maintenance/:id or GET /api/maintenance/:id
// @access  Private
exports.getMaintenance = async (req, res, next) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id)
      .populate('vehicleId', 'vehicleNumber vehicleType model status')
      .populate('clientId', 'name email');

    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    if (isClient(req.user.role)) {
      if (!maintenance.clientId) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this record' });
      }
      const mClientId = (maintenance.clientId._id || maintenance.clientId).toString();
      if (mClientId !== req.user.clientId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this record' });
      }
    }

    res.status(200).json({
      success: true,
      data: maintenance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new maintenance record (sets vehicle to MAINTENANCE)
// @route   POST /api/v1/maintenance or POST /api/maintenance
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.createMaintenance = async (req, res, next) => {
  try {
    const { vehicleId, description, startDate, cost } = req.body;
    const errors = {};

    if (!vehicleId) {
      errors.vehicleId = 'Vehicle selection is required.';
    }

    const descCheck = validateTextLength(description, 'Maintenance description', 5, 250, true);
    if (!descCheck.isValid) errors.description = descCheck.error;

    const costVal = cost !== undefined && cost !== '' ? cost : 0;
    const costCheck = validateAmount(costVal, 'Maintenance cost', 0, 10000000);
    if (!costCheck.isValid) errors.cost = costCheck.error;

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (isClient(req.user.role)) {
      if (!vehicle.clientId) {
        return res.status(403).json({ success: false, message: 'Not authorized to add maintenance for platform vehicles' });
      }
      const vClientId = (vehicle.clientId._id || vehicle.clientId).toString();
      if (vClientId !== req.user.clientId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to add maintenance for this vehicle' });
      }
    }

    const clientId = vehicle.clientId ? (vehicle.clientId._id || vehicle.clientId) : null;

    const maintenance = await Maintenance.create({
      vehicleId,
      clientId,
      description: descCheck.value,
      startDate: startDate || Date.now(),
      status: 'IN_PROGRESS',
      cost: costCheck.value,
    });

    vehicle.status = 'MAINTENANCE';
    await vehicle.save();

    await createNotification({
      clientId,
      title: 'Vehicle Sent to Maintenance',
      message: `Vehicle ${vehicle.vehicleNumber} has been scheduled for maintenance: ${description}`,
      type: 'MAINTENANCE_STARTED',
    });

    await recordAuditLog({
      req,
      action: 'Maintenance created',
      resource: 'Maintenance',
      resourceId: maintenance._id,
      details: `Scheduled maintenance for vehicle ${vehicle.vehicleNumber}: ${description}`,
    });

    const populated = await Maintenance.findById(maintenance._id)
      .populate('vehicleId', 'vehicleNumber vehicleType model status')
      .populate('clientId', 'name email');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update maintenance record
// @route   PUT /api/v1/maintenance/:id or PUT /api/maintenance/:id
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.updateMaintenance = async (req, res, next) => {
  try {
    let maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    if (isClient(req.user.role)) {
      if (!maintenance.clientId) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this record' });
      }
      const mClientId = (maintenance.clientId._id || maintenance.clientId).toString();
      if (mClientId !== req.user.clientId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this record' });
      }
    }

    // Whitelist and validate update fields (H-07)
    const allowedUpdates = {};
    if (req.body.description !== undefined) {
      const descCheck = validateTextLength(req.body.description, 'Maintenance description', 5, 250);
      if (!descCheck.isValid) {
        return res.status(400).json({ success: false, message: descCheck.error });
      }
      allowedUpdates.description = descCheck.value;
    }

    if (req.body.cost !== undefined) {
      const costCheck = validateAmount(req.body.cost, 'Maintenance cost', 0, 1000000);
      if (!costCheck.isValid) {
        return res.status(400).json({ success: false, message: costCheck.error });
      }
      allowedUpdates.cost = costCheck.value;
    }

    if (req.body.startDate !== undefined) {
      allowedUpdates.startDate = req.body.startDate;
    }

    if (req.body.endDate !== undefined) {
      allowedUpdates.endDate = req.body.endDate;
    }

    if (req.body.status !== undefined) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
      if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      allowedUpdates.status = req.body.status;
    }

    maintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { $set: allowedUpdates },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('vehicleId', 'vehicleNumber vehicleType model status')
      .populate('clientId', 'name email');

    await recordAuditLog({
      req,
      action: 'Maintenance updated',
      resource: 'Maintenance',
      resourceId: maintenance._id,
      details: `Updated maintenance record for vehicle ${maintenance.vehicleId?.vehicleNumber || ''}`,
    });

    res.status(200).json({
      success: true,
      data: maintenance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete maintenance (sets vehicle status back to AVAILABLE)
// @route   PATCH /api/v1/maintenance/:id/complete or PATCH /api/maintenance/:id/complete
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.completeMaintenance = async (req, res, next) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    if (isClient(req.user.role)) {
      if (!maintenance.clientId) {
        return res.status(403).json({ success: false, message: 'Not authorized to complete this record' });
      }
      const mClientId = (maintenance.clientId._id || maintenance.clientId).toString();
      if (mClientId !== req.user.clientId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to complete this record' });
      }
    }

    maintenance.status = 'COMPLETED';
    maintenance.endDate = new Date();
    if (req.body.cost !== undefined) {
      maintenance.cost = Number(req.body.cost);
    }
    await maintenance.save();

    const vehicle = await Vehicle.findById(maintenance.vehicleId);
    if (vehicle) {
      vehicle.status = 'AVAILABLE';
      await vehicle.save();
    }

    await createNotification({
      clientId: maintenance.clientId,
      title: 'Maintenance Completed',
      message: `Maintenance for vehicle ${vehicle ? vehicle.vehicleNumber : ''} has been completed and returned to active fleet.`,
      type: 'MAINTENANCE_COMPLETED',
    });

    await recordAuditLog({
      req,
      action: 'Maintenance completed',
      resource: 'Maintenance',
      resourceId: maintenance._id,
      details: `Completed maintenance for vehicle ${vehicle ? vehicle.vehicleNumber : ''}`,
    });

    const populated = await Maintenance.findById(maintenance._id)
      .populate('vehicleId', 'vehicleNumber vehicleType model status')
      .populate('clientId', 'name email');

    res.status(200).json({
      success: true,
      message: 'Maintenance completed and vehicle marked AVAILABLE',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};
