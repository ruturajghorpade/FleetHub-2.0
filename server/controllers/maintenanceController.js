const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');
const { createNotification } = require('../utils/notificationHelper');
const { isClient } = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');

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

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (isClient(req.user.role)) {
      const vClientId = (vehicle.clientId._id || vehicle.clientId).toString();
      if (vClientId !== req.user.clientId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to add maintenance for this vehicle' });
      }
    }

    let clientId = vehicle.clientId;

    const maintenance = await Maintenance.create({
      vehicleId,
      clientId,
      description,
      startDate: startDate || Date.now(),
      status: 'IN_PROGRESS',
      cost: cost ? Number(cost) : 0,
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
      const mClientId = (maintenance.clientId._id || maintenance.clientId).toString();
      if (mClientId !== req.user.clientId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this record' });
      }
    }

    maintenance = await Maintenance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
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
