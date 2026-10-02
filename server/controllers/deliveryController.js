const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Branch = require('../models/Branch');
const Client = require('../models/Client');
const { createNotification } = require('../utils/notificationHelper');
const {
  isClientScoped,
  isDriver,
  isClient,
  isOperations,
  isPlatformAdmin,
  isDispatcher,
} = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');
const {
  validateName,
  validatePhone,
  validateAddress,
  validateAmount,
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

// Sanitize delivery object for client (hide driver personal phone & license)
const sanitizeDeliveryForClient = (deliveryDoc) => {
  const d = deliveryDoc.toObject ? deliveryDoc.toObject() : { ...deliveryDoc };
  if (d.driverId && typeof d.driverId === 'object') {
    d.driverId = {
      _id: d.driverId._id,
      name: d.driverId.name,
      status: d.driverId.status,
    };
  }
  return d;
};

// @desc    Get deliveries (multi-client isolated)
// @route   GET /api/v1/deliveries or GET /api/deliveries
// @access  Private (SUPER_ADMIN, ADMIN, DISPATCHER, CLIENT, DRIVER)
exports.getDeliveries = async (req, res, next) => {
  try {
    const filter = {};

    // 1. CLIENT: Strictly enforce authenticated user's clientId
    if (isClient(req.user.role)) {
      if (!req.user.clientId) {
        return res.status(403).json({
          success: false,
          message: 'Client account is not linked to any restaurant organization.',
        });
      }
      filter.clientId = req.user.clientId;
    }

    // 2. DRIVER: Strictly filter deliveries assigned to this driver
    else if (isDriver(req.user.role)) {
      const driverId = await getLinkedDriverId(req.user);
      if (driverId) {
        filter.driverId = driverId;
      } else {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }
    }

    // 3. OPERATIONS (SUPER_ADMIN, ADMIN, DISPATCHER): Can view all or filter by query
    else {
      if (req.query.clientId) {
        filter.clientId = req.query.clientId;
      }
    }

    // Status filter
    if (req.query.status) {
      if (req.query.status.includes(',')) {
        filter.status = { $in: req.query.status.split(',').map((s) => s.trim()) };
      } else {
        filter.status = req.query.status.trim();
      }
    }

    // Branch filter
    if (req.query.branchId) {
      filter.branchId = req.query.branchId;
    }

    // Search filter
    if (req.query.search) {
      const cleanSearch = sanitizeSearchQuery(req.query.search);
      if (cleanSearch) {
        filter.$or = [
          { orderId: { $regex: cleanSearch, $options: 'i' } },
          { customerName: { $regex: cleanSearch, $options: 'i' } },
          { customerPhone: { $regex: cleanSearch, $options: 'i' } },
          { deliveryAddress: { $regex: cleanSearch, $options: 'i' } },
        ];
      }
    }

    const deliveries = await Delivery.find(filter)
      .populate('clientId', 'name email phone address')
      .populate('branchId', 'name address phone')
      .populate('driverId', 'name phone licenseNumber status')
      .populate('vehicleId', 'vehicleNumber vehicleType model status')
      .sort({ createdAt: -1 });

    // Sanitize driver private info for CLIENT
    const responseData = isClient(req.user.role)
      ? deliveries.map(sanitizeDeliveryForClient)
      : deliveries;

    res.status(200).json({
      success: true,
      count: responseData.length,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single delivery
// @route   GET /api/v1/deliveries/:id or GET /api/deliveries/:id
// @access  Private
exports.getDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('clientId', 'name email phone address')
      .populate('branchId', 'name address phone')
      .populate('driverId', 'name phone licenseNumber status')
      .populate('vehicleId', 'vehicleNumber vehicleType model status');

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    // Client multi-tenant isolation check
    if (isClient(req.user.role)) {
      const dClientId = (delivery.clientId._id || delivery.clientId).toString();
      if (dClientId !== req.user.clientId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this delivery.',
        });
      }
      return res.status(200).json({
        success: true,
        data: sanitizeDeliveryForClient(delivery),
      });
    }

    // Driver isolation check
    if (isDriver(req.user.role)) {
      const driverId = await getLinkedDriverId(req.user);
      if (
        !driverId ||
        !delivery.driverId ||
        (delivery.driverId._id || delivery.driverId).toString() !== driverId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view another driver delivery.',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create delivery request (Client creates delivery with status REQUESTED)
// @route   POST /api/v1/deliveries or POST /api/deliveries
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.createDelivery = async (req, res, next) => {
  try {
    let clientId;

    if (isClient(req.user.role)) {
      if (!req.user.clientId) {
        return res.status(400).json({
          success: false,
          message: 'Your user account is not linked to a Client organization.',
        });
      }
      clientId = req.user.clientId;
    } else {
      clientId = req.body.clientId || req.user.clientId;
    }

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required.' });
    }

    const {
      customerName,
      customerPhone,
      deliveryAddress,
      orderItems,
      amount,
      branchId,
      deliveryNotes,
      notes,
    } = req.body;

    const errors = {};

    const nameCheck = validateName(customerName, 'Customer name', 2, 50);
    if (!nameCheck.isValid) errors.customerName = nameCheck.error;

    const phoneCheck = validatePhone(customerPhone, 'Customer phone number');
    if (!phoneCheck.isValid) errors.customerPhone = phoneCheck.error;

    const addressCheck = validateAddress(deliveryAddress, 'Delivery address', 5, 250);
    if (!addressCheck.isValid) errors.deliveryAddress = addressCheck.error;

    const amountCheck = validateAmount(amount, 'Order amount', 0, 1000000);
    if (!amountCheck.isValid) errors.amount = amountCheck.error;

    if (!branchId) {
      errors.branchId = 'Branch selection is required.';
    }

    const finalNotes = (deliveryNotes || notes || '').trim();
    if (finalNotes.length > 250) {
      errors.deliveryNotes = 'Delivery notes cannot exceed 250 characters.';
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    // Enforce branch ownership: branch must belong to clientId
    const branch = await Branch.findOne({ _id: branchId, clientId });
    if (!branch) {
      return sendValidationError(
        res,
        { branchId: 'Selected branch does not belong to your client account.' },
        'Selected branch does not belong to your client account.'
      );
    }

    // Initially driverId = null, vehicleId = null, status = REQUESTED
    const delivery = await Delivery.create({
      clientId,
      branchId,
      customerName: nameCheck.value,
      customerPhone: phoneCheck.value,
      deliveryAddress: addressCheck.value,
      orderItems: (orderItems || 'Food Items').trim().slice(0, 500),
      amount: amountCheck.value,
      deliveryNotes: finalNotes,
      driverId: null,
      vehicleId: null,
      status: 'REQUESTED',
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('clientId', 'name')
      .populate('branchId', 'name address phone');

    // Create Notification
    await createNotification({
      clientId,
      title: 'New Delivery Requested',
      message: `Delivery ${delivery.orderId} for ${customerName} has been created. Status: REQUESTED.`,
      type: 'DELIVERY_CREATED',
    });

    await recordAuditLog({
      req,
      action: 'Delivery created',
      resource: 'Delivery',
      resourceId: delivery._id,
      details: `Created delivery request ${delivery.orderId} for ${customerName} (₹${amount})`,
    });

    res.status(201).json({
      success: true,
      message: 'Delivery request created successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign Driver and Vehicle to delivery (FleetHub Dispatcher / Admin only)
// @route   PATCH /api/v1/deliveries/:id/assign or PATCH /api/v1/deliveries/:id/reassign
// @access  Private (SUPER_ADMIN, ADMIN, DISPATCHER only)
exports.assignDelivery = async (req, res, next) => {
  try {
    // Client is strictly forbidden from assigning drivers/vehicles
    if (isClient(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to assign drivers or vehicles. This is managed by FleetHub operations.',
      });
    }

    const { driverId, vehicleId } = req.body;

    if (!driverId || !vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Both driverId and vehicleId must be provided for assignment.',
      });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    // Check delivery status is assignable
    const assignableStatuses = [
      'REQUESTED',
      'WAITING_FOR_DRIVER',
      'PENDING',
      'DRIVER_REJECTED',
      'ASSIGNMENT_FAILED',
      // Allow reassigning if already assigned
      'DRIVER_ASSIGNED',
      'ASSIGNED',
      'ACCEPTED',
    ];

    if (!assignableStatuses.includes(delivery.status)) {
      return res.status(400).json({
        success: false,
        message: `Delivery cannot be assigned in its current status "${delivery.status}".`,
      });
    }

    // 1. Double Assignment Protection & Driver Validation
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }
    if (driver.status === 'INACTIVE') {
      return res.status(400).json({ success: false, message: 'Driver is currently INACTIVE.' });
    }
    if (['ON_BREAK', 'OFF_DUTY'].includes(driver.status)) {
      return res.status(400).json({ success: false, message: `Driver is currently ${driver.status}.` });
    }

    // Check if driver is already handling another active delivery
    const activeDriverDelivery = await Delivery.findOne({
      driverId: driver._id,
      status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
      _id: { $ne: delivery._id },
    });
    if (activeDriverDelivery || driver.status === 'BUSY') {
      return res.status(400).json({
        success: false,
        message: 'Driver is no longer available.',
      });
    }

    // 2. Double Assignment Protection & Vehicle Validation
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }
    if (vehicle.status === 'MAINTENANCE') {
      return res.status(400).json({ success: false, message: 'Vehicle is currently under maintenance.' });
    }
    if (vehicle.status === 'INACTIVE') {
      return res.status(400).json({ success: false, message: 'Vehicle is currently INACTIVE.' });
    }

    // Check if vehicle is already assigned to another active delivery
    const activeVehicleDelivery = await Delivery.findOne({
      vehicleId: vehicle._id,
      status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
      _id: { $ne: delivery._id },
    });
    if (activeVehicleDelivery || vehicle.status === 'IN_USE') {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is no longer available.',
      });
    }

    // Reassignment cleanup: release previously assigned driver/vehicle if changed
    if (delivery.driverId && delivery.driverId.toString() !== driver._id.toString()) {
      await Driver.findByIdAndUpdate(delivery.driverId, { status: 'AVAILABLE' });
    }
    if (delivery.vehicleId && delivery.vehicleId.toString() !== vehicle._id.toString()) {
      const prevV = await Vehicle.findById(delivery.vehicleId);
      if (prevV && prevV.status !== 'MAINTENANCE') {
        prevV.status = 'AVAILABLE';
        await prevV.save();
      }
    }

    // Update Driver & Vehicle
    driver.status = 'ASSIGNED';
    await driver.save();

    vehicle.status = 'ASSIGNED';
    await vehicle.save();

    // Update Delivery: status = DRIVER_ASSIGNED
    delivery.driverId = driver._id;
    delivery.vehicleId = vehicle._id;
    delivery.status = 'DRIVER_ASSIGNED';
    delivery.assignedAt = new Date();
    await delivery.save();

    const populated = await Delivery.findById(delivery._id)
      .populate('clientId', 'name email phone')
      .populate('branchId', 'name address phone')
      .populate('driverId', 'name phone licenseNumber status')
      .populate('vehicleId', 'vehicleNumber vehicleType model status');

    // Notify Driver
    await createNotification({
      clientId: delivery.clientId,
      driverId: driver._id,
      title: 'New Delivery Assigned',
      message: `Delivery ${delivery.orderId} assigned to you with vehicle ${vehicle.vehicleNumber}. Please accept or reject.`,
      type: 'DELIVERY_ASSIGNED',
    });

    // Notify Client
    await createNotification({
      clientId: delivery.clientId,
      title: 'Driver Assigned',
      message: `A delivery partner has been assigned to order ${delivery.orderId}.`,
      type: 'DELIVERY_ASSIGNED',
    });

    await recordAuditLog({
      req,
      action: 'Delivery assigned',
      resource: 'Delivery',
      resourceId: delivery._id,
      details: `Delivery ${delivery.orderId} assigned to Driver ${driver.name} and Vehicle ${vehicle.vehicleNumber}`,
    });

    res.status(200).json({
      success: true,
      message: 'Delivery assigned successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver Accepts Delivery
// @route   PATCH /api/v1/deliveries/:id/accept or PATCH /api/deliveries/:id/accept
// @access  Private (DRIVER, SUPER_ADMIN, ADMIN)
exports.acceptDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    if (!['DRIVER_ASSIGNED', 'ASSIGNED'].includes(delivery.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept delivery in status "${delivery.status}". Must be DRIVER_ASSIGNED.`,
      });
    }

    // Driver verification
    if (isDriver(req.user.role)) {
      const driverId = await getLinkedDriverId(req.user);
      if (
        !driverId ||
        !delivery.driverId ||
        delivery.driverId.toString() !== driverId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to accept this delivery. Not assigned to you.',
        });
      }
    }

    delivery.status = 'ACCEPTED';
    delivery.acceptedAt = new Date();
    await delivery.save();

    // Driver status: BUSY
    if (delivery.driverId) {
      await Driver.findByIdAndUpdate(delivery.driverId, { status: 'BUSY' });
    }

    // Vehicle status: IN_USE
    if (delivery.vehicleId) {
      await Vehicle.findByIdAndUpdate(delivery.vehicleId, { status: 'IN_USE' });
    }

    await createNotification({
      clientId: delivery.clientId,
      title: 'Delivery Accepted',
      message: `Driver accepted delivery ${delivery.orderId}.`,
      type: 'DELIVERY_ACCEPTED',
    });

    await recordAuditLog({
      req,
      action: 'DELIVERY_ACCEPTED',
      resource: 'Delivery',
      resourceId: delivery._id,
      details: `Delivery ${delivery.orderId} accepted by driver`,
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('clientId', 'name email phone')
      .populate('branchId', 'name address phone')
      .populate('driverId', 'name phone licenseNumber status')
      .populate('vehicleId', 'vehicleNumber vehicleType model status');

    res.status(200).json({
      success: true,
      message: 'Delivery accepted successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver Rejects Delivery
// @route   PATCH /api/v1/deliveries/:id/reject or PATCH /api/deliveries/:id/reject
// @access  Private (DRIVER, SUPER_ADMIN, ADMIN)
exports.rejectDelivery = async (req, res, next) => {
  try {
    const rawReason = req.body.reason || req.body.rejectionReason;
    const reasonCheck = validateTextLength(rawReason, 'Rejection reason', 3, 250, true);
    if (!reasonCheck.isValid) {
      return sendValidationError(res, { reason: reasonCheck.error }, reasonCheck.error);
    }
    const reason = reasonCheck.value;

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    if (!['DRIVER_ASSIGNED', 'ASSIGNED'].includes(delivery.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject delivery in status "${delivery.status}". Must be DRIVER_ASSIGNED.`,
      });
    }

    // Driver verification
    if (isDriver(req.user.role)) {
      const driverId = await getLinkedDriverId(req.user);
      if (
        !driverId ||
        !delivery.driverId ||
        delivery.driverId.toString() !== driverId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to reject this delivery. Not assigned to you.',
        });
      }
    }
    const driverId = delivery.driverId;
    const vehicleId = delivery.vehicleId;

    // Release driver and vehicle back to AVAILABLE
    if (driverId) {
      await Driver.findByIdAndUpdate(driverId, { status: 'AVAILABLE' });
    }
    if (vehicleId) {
      const v = await Vehicle.findById(vehicleId);
      if (v && v.status !== 'MAINTENANCE') {
        v.status = 'AVAILABLE';
        await v.save();
      }
    }

    delivery.rejectionCount = (delivery.rejectionCount || 0) + 1;
    delivery.rejectionReason = reason;
    if (!delivery.rejectedBy) delivery.rejectedBy = [];
    delivery.rejectedBy.push({
      driverId: driverId,
      driverName: req.user.name || 'Driver',
      reason,
      rejectedAt: new Date(),
    });

    delivery.driverId = null;
    delivery.vehicleId = null;

    // Check multiple rejections threshold: >= 3 rejections -> ASSIGNMENT_FAILED
    if (delivery.rejectionCount >= 3) {
      delivery.status = 'ASSIGNMENT_FAILED';
    } else {
      delivery.status = 'WAITING_FOR_DRIVER';
    }

    await delivery.save();

    await createNotification({
      clientId: delivery.clientId,
      title: delivery.status === 'ASSIGNMENT_FAILED' ? 'Assignment Failed' : 'Driver Rejected',
      message: `Delivery ${delivery.orderId}: driver rejected. Status: ${delivery.status}. Reason: ${reason}`,
      type: delivery.status === 'ASSIGNMENT_FAILED' ? 'ASSIGNMENT_FAILED' : 'DRIVER_REJECTED',
    });

    await recordAuditLog({
      req,
      action: 'DELIVERY_REJECTED',
      resource: 'Delivery',
      resourceId: delivery._id,
      details: `Delivery ${delivery.orderId} rejected by driver. Status: ${delivery.status}. Reason: ${reason}`,
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('clientId', 'name email phone')
      .populate('branchId', 'name address phone');

    res.status(200).json({
      success: true,
      message: `Delivery rejected. Status is now ${delivery.status}.`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update delivery status along linear pipeline
// @route   PATCH /api/v1/deliveries/:id/status or PATCH /api/deliveries/:id/status
// @access  Private (DRIVER, SUPER_ADMIN, ADMIN, DISPATCHER only. CLIENT is 403 Forbidden)
exports.updateDeliveryStatus = async (req, res, next) => {
  try {
    // Client cannot update operational delivery status
    if (isClient(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Clients are not authorized to update driver delivery status.',
      });
    }

    const { status } = req.body;
    const allowedTransitions = ['ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition. Allowed transitions are: ${allowedTransitions.join(', ')}`,
      });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    // Driver verification
    if (isDriver(req.user.role)) {
      const driverId = await getLinkedDriverId(req.user);
      if (
        !driverId ||
        !delivery.driverId ||
        delivery.driverId.toString() !== driverId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: 'Cannot update delivery assigned to another driver.',
        });
      }
    }

    // Validate sequential progression:
    // DRIVER_ASSIGNED -> ACCEPTED
    // ACCEPTED -> PICKED_UP
    // PICKED_UP -> OUT_FOR_DELIVERY
    // OUT_FOR_DELIVERY -> DELIVERED
    if (status === 'ACCEPTED' && !['DRIVER_ASSIGNED', 'ASSIGNED'].includes(delivery.status)) {
      return res.status(400).json({
        success: false,
        message: `Delivery must be DRIVER_ASSIGNED before marking ACCEPTED. Current: ${delivery.status}`,
      });
    }

    if (status === 'PICKED_UP' && delivery.status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: `Delivery must be ACCEPTED before marking PICKED_UP. Current status: ${delivery.status}`,
      });
    }

    if (status === 'OUT_FOR_DELIVERY' && !['PICKED_UP', 'ACCEPTED'].includes(delivery.status)) {
      return res.status(400).json({
        success: false,
        message: `Delivery must be PICKED_UP before moving OUT_FOR_DELIVERY. Current status: ${delivery.status}`,
      });
    }

    if (status === 'DELIVERED' && delivery.status !== 'OUT_FOR_DELIVERY') {
      return res.status(400).json({
        success: false,
        message: `Delivery must be OUT_FOR_DELIVERY before marking DELIVERED. Current status: ${delivery.status}`,
      });
    }

    delivery.status = status;
    if (status === 'PICKED_UP') delivery.pickedUpAt = new Date();
    if (status === 'DELIVERED') delivery.deliveredAt = new Date();

    await delivery.save();

    // Release driver and vehicle if DELIVERED
    if (status === 'DELIVERED') {
      if (delivery.driverId) {
        await Driver.findByIdAndUpdate(delivery.driverId, { status: 'AVAILABLE' });
      }
      if (delivery.vehicleId) {
        const v = await Vehicle.findById(delivery.vehicleId);
        if (v && v.status !== 'MAINTENANCE') {
          v.status = 'AVAILABLE';
          await v.save();
        }
      }

      await createNotification({
        clientId: delivery.clientId,
        driverId: delivery.driverId,
        title: 'Delivery Completed',
        message: `Delivery ${delivery.orderId} for ${delivery.customerName} has been DELIVERED!`,
        type: 'DELIVERY_DELIVERED',
      });
    } else {
      const typeMap = {
        ACCEPTED: 'DELIVERY_ACCEPTED',
        PICKED_UP: 'PICKED_UP',
        OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
      };
      await createNotification({
        clientId: delivery.clientId,
        driverId: delivery.driverId,
        title: `Delivery ${status.replace(/_/g, ' ')}`,
        message: `Delivery ${delivery.orderId} status changed to ${status.replace(/_/g, ' ')}.`,
        type: typeMap[status] || 'SYSTEM',
      });
    }

    await recordAuditLog({
      req,
      action: `Delivery status updated to ${status}`,
      resource: 'Delivery',
      resourceId: delivery._id,
      details: `Delivery ${delivery.orderId} status changed to ${status}`,
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('clientId', 'name email phone')
      .populate('branchId', 'name address phone')
      .populate('driverId', 'name phone licenseNumber status')
      .populate('vehicleId', 'vehicleNumber vehicleType model status');

    res.status(200).json({
      success: true,
      message: `Delivery status updated to ${status}`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel delivery (Allowed when REQUESTED, WAITING_FOR_DRIVER, PENDING, DRIVER_ASSIGNED)
// @route   PATCH /api/v1/deliveries/:id/cancel or PATCH /api/deliveries/:id/cancel
// @access  Private (SUPER_ADMIN, ADMIN, DISPATCHER, CLIENT)
exports.cancelDelivery = async (req, res, next) => {
  try {
    const rawReason = req.body.cancellationReason || req.body.reason;
    const reasonCheck = validateTextLength(rawReason, 'Cancellation reason', 5, 250, true);
    if (!reasonCheck.isValid) {
      return sendValidationError(res, { cancellationReason: reasonCheck.error }, reasonCheck.error);
    }
    const finalReason = reasonCheck.value;

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    // Client organization data isolation check
    if (isClient(req.user.role)) {
      const dClientId = (delivery.clientId._id || delivery.clientId).toString();
      if (dClientId !== req.user.clientId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to cancel this delivery.',
        });
      }
    }

    // Strict status cancellation rules: CANNOT cancel if PICKED_UP, OUT_FOR_DELIVERY, DELIVERED
    if (delivery.status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an already DELIVERED order.',
      });
    }

    if (delivery.status === 'OUT_FOR_DELIVERY' || delivery.status === 'PICKED_UP') {
      return res.status(400).json({
        success: false,
        message: 'Delivery cannot be cancelled at this stage.',
      });
    }

    if (delivery.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Delivery is already CANCELLED.',
      });
    }

    // Free assigned driver and vehicle if any
    if (delivery.driverId) {
      await Driver.findByIdAndUpdate(delivery.driverId, { status: 'AVAILABLE' });
    }
    if (delivery.vehicleId) {
      const v = await Vehicle.findById(delivery.vehicleId);
      if (v && v.status !== 'MAINTENANCE') {
        v.status = 'AVAILABLE';
        await v.save();
      }
    }

    delivery.status = 'CANCELLED';
    delivery.cancellationReason = finalReason;
    await delivery.save();

    const populated = await Delivery.findById(delivery._id)
      .populate('clientId', 'name')
      .populate('branchId', 'name')
      .populate('driverId', 'name')
      .populate('vehicleId', 'vehicleNumber');

    await createNotification({
      clientId: delivery.clientId,
      title: 'Delivery Cancelled',
      message: `Delivery ${delivery.orderId} was cancelled. Reason: ${finalReason}`,
      type: 'DELIVERY_CANCELLED',
    });

    await recordAuditLog({
      req,
      action: 'Delivery cancelled',
      resource: 'Delivery',
      resourceId: delivery._id,
      details: `Delivery ${delivery.orderId} cancelled. Reason: ${finalReason}`,
    });

    res.status(200).json({
      success: true,
      message: 'Delivery successfully cancelled.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set status to WAITING_FOR_DRIVER (Dispatcher indicates no driver currently available)
// @route   PATCH /api/v1/deliveries/:id/waiting or PATCH /api/deliveries/:id/waiting
// @access  Private (SUPER_ADMIN, ADMIN, DISPATCHER only)
exports.markWaitingForDriver = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' });
    }

    delivery.status = 'WAITING_FOR_DRIVER';
    delivery.driverId = null;
    delivery.vehicleId = null;
    await delivery.save();

    await createNotification({
      clientId: delivery.clientId,
      title: 'Finding Delivery Partner',
      message: 'Finding an available delivery partner.',
      type: 'NO_DRIVER_AVAILABLE',
    });

    res.status(200).json({
      success: true,
      message: 'Delivery is now waiting for an available driver.',
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
};
