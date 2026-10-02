const Delivery = require('../models/Delivery');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Client = require('../models/Client');
const User = require('../models/User');
const Maintenance = require('../models/Maintenance');
const { isDriver, isClient, isPlatformAdmin, isSuperAdmin } = require('../utils/roles');

// Helper to find driver linked to a user with role DRIVER
const getLinkedDriver = async (user) => {
  if (user.role !== 'DRIVER') return null;
  return await Driver.findOne({
    $or: [
      { phone: user.phone },
      { name: user.name },
      ...(user.licenseNumber ? [{ licenseNumber: user.licenseNumber }] : []),
    ],
  });
};

// @desc    Get dashboard metrics & recent deliveries tailored per role
// @route   GET /api/v1/reports/dashboard or GET /api/reports/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const filter = { ...req.tenantFilter };

    // Today's boundaries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // ============================================
    // 1. DRIVER DASHBOARD METRICS
    // ============================================
    if (isDriver(userRole)) {
      const driver = await getLinkedDriver(req.user);

      if (!driver) {
        return res.status(200).json({
          success: true,
          data: {
            todaysDeliveries: 0,
            pendingDeliveries: 0,
            activeDeliveries: 0,
            completedDeliveries: 0,
            deliveredOrders: 0,
            cancelledOrders: 0,
            activeDelivery: null,
            assignedVehicle: null,
            deliveryHistory: [],
            recentDeliveries: [],
          },
        });
      }

      const driverFilter = { driverId: driver._id };

      const [
        todaysDeliveries,
        activeDelivery,
        deliveryHistory,
        completedDeliveries,
      ] = await Promise.all([
        Delivery.countDocuments({
          ...driverFilter,
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        }),
        Delivery.findOne({
          ...driverFilter,
          status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
        })
          .populate('clientId', 'name phone address')
          .populate('branchId', 'name address phone')
          .populate('vehicleId', 'vehicleNumber vehicleType model status'),
        Delivery.find(driverFilter)
          .populate('clientId', 'name')
          .populate('branchId', 'name address')
          .populate('vehicleId', 'vehicleNumber vehicleType model')
          .sort({ createdAt: -1 })
          .limit(10),
        Delivery.countDocuments({
          ...driverFilter,
          status: 'DELIVERED',
        }),
      ]);

      const assignedVehicle =
        activeDelivery?.vehicleId ||
        (await Vehicle.findOne({ clientId: driver.clientId, status: 'AVAILABLE' }));

      return res.status(200).json({
        success: true,
        data: {
          todaysDeliveries,
          activeDeliveries: activeDelivery ? 1 : 0,
          pendingDeliveries: activeDelivery ? 1 : 0,
          completedDeliveries,
          deliveredOrders: completedDeliveries,
          cancelledOrders: 0,
          activeDelivery,
          assignedVehicle,
          deliveryHistory,
          recentDeliveries: deliveryHistory,
          currentStatus: activeDelivery ? activeDelivery.status : 'AVAILABLE',
        },
      });
    }

    // ============================================
    // 2. CLIENT DASHBOARD METRICS (Pure Delivery Focus)
    // ============================================
    if (isClient(userRole)) {
      const clientFilter = { clientId: req.user.clientId };

      const [
        totalDeliveries,
        todaysDeliveries,
        pendingDeliveries,
        activeDeliveries,
        completedDeliveries,
        cancelledOrders,
        recentDeliveriesRaw,
      ] = await Promise.all([
        Delivery.countDocuments(clientFilter),
        Delivery.countDocuments({
          ...clientFilter,
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        }),
        Delivery.countDocuments({
          ...clientFilter,
          status: { $in: ['REQUESTED', 'WAITING_FOR_DRIVER', 'PENDING'] },
        }),
        Delivery.countDocuments({
          ...clientFilter,
          status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
        }),
        Delivery.countDocuments({ ...clientFilter, status: 'DELIVERED' }),
        Delivery.countDocuments({ ...clientFilter, status: 'CANCELLED' }),
        Delivery.find(clientFilter)
          .populate('clientId', 'name')
          .populate('branchId', 'name address')
          .populate('driverId', 'name') // No driver phone or license exposed to client
          .populate('vehicleId', 'vehicleNumber vehicleType')
          .sort({ createdAt: -1 })
          .limit(8),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalDeliveries,
          todaysDeliveries,
          pendingDeliveries,
          activeDeliveries,
          completedDeliveries,
          deliveredOrders: completedDeliveries,
          cancelledOrders,
          recentDeliveries: recentDeliveriesRaw,
        },
      });
    }

    // ============================================
    // 3. DISPATCHER DASHBOARD METRICS
    // ============================================
    if (userRole === 'DISPATCHER') {
      const [
        newRequests,
        waitingForDriver,
        driverRejected,
        assignmentFailed,
        activeDeliveries,
        completedDeliveries,
        availableDrivers,
        availableVehicles,
        recentDeliveries,
      ] = await Promise.all([
        Delivery.countDocuments({ status: { $in: ['REQUESTED', 'PENDING'] } }),
        Delivery.countDocuments({ status: 'WAITING_FOR_DRIVER' }),
        Delivery.countDocuments({ status: 'DRIVER_REJECTED' }),
        Delivery.countDocuments({ status: 'ASSIGNMENT_FAILED' }),
        Delivery.countDocuments({
          status: { $in: ['DRIVER_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
        }),
        Delivery.countDocuments({ status: 'DELIVERED' }),
        Driver.countDocuments({ status: 'AVAILABLE' }),
        Vehicle.countDocuments({ status: 'AVAILABLE' }),
        Delivery.find()
          .populate('clientId', 'name phone address')
          .populate('branchId', 'name address phone')
          .populate('driverId', 'name phone licenseNumber status')
          .populate('vehicleId', 'vehicleNumber vehicleType model status')
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          newRequests,
          waitingForDriver,
          driverRejected,
          assignmentFailed,
          pendingAssignment: newRequests + waitingForDriver + driverRejected,
          activeDeliveries,
          completedDeliveries,
          deliveredOrders: completedDeliveries,
          availableDrivers,
          availableVehicles,
          recentDeliveries,
        },
      });
    }

    // ============================================
    // 3. ADMIN & SUPER_ADMIN DASHBOARD METRICS
    // ============================================
    const [
      totalAdmins,
      totalClients,
      totalDrivers,
      totalVehicles,
      totalDeliveries,
      activeDeliveries,
      pendingDeliveries,
      completedDeliveries,
      cancelledOrders,
      vehiclesInMaintenance,
      todaysDeliveries,
      recentDeliveries,
    ] = await Promise.all([
      User.countDocuments({ role: 'ADMIN' }),
      Client.countDocuments(filter),
      Driver.countDocuments(filter),
      Vehicle.countDocuments(filter),
      Delivery.countDocuments(filter),
      Delivery.countDocuments({
        ...filter,
        status: { $in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
      }),
      Delivery.countDocuments({ ...filter, status: 'PENDING' }),
      Delivery.countDocuments({ ...filter, status: 'DELIVERED' }),
      Delivery.countDocuments({ ...filter, status: 'CANCELLED' }),
      Vehicle.countDocuments({ ...filter, status: 'MAINTENANCE' }),
      Delivery.countDocuments({
        ...filter,
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      }),
      Delivery.find(filter)
        .populate('clientId', 'name')
        .populate('branchId', 'name')
        .populate('driverId', 'name phone')
        .populate('vehicleId', 'vehicleNumber vehicleType')
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAdmins,
        totalClients,
        totalDrivers,
        totalVehicles,
        totalDeliveries,
        activeDeliveries,
        pendingDeliveries,
        completedDeliveries,
        deliveredOrders: completedDeliveries,
        cancelledOrders,
        vehiclesInMaintenance,
        todaysDeliveries,
        recentDeliveries,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed report analytics
// @route   GET /api/v1/reports/analytics or GET /api/reports/analytics
// @access  Private
exports.getReports = async (req, res, next) => {
  try {
    const filter = { ...req.tenantFilter };

    const [
      totalDeliveries,
      deliveredCount,
      pendingCount,
      assignedCount,
      outForDeliveryCount,
      cancelledCount,
      totalVehicles,
      vehiclesAvailable,
      vehiclesAssigned,
      vehiclesMaintenance,
      totalDrivers,
      driversAvailable,
      driversAssigned,
      completedMaintenanceCount,
      revenueResult,
    ] = await Promise.all([
      Delivery.countDocuments(filter),
      Delivery.countDocuments({ ...filter, status: 'DELIVERED' }),
      Delivery.countDocuments({ ...filter, status: 'PENDING' }),
      Delivery.countDocuments({ ...filter, status: 'ASSIGNED' }),
      Delivery.countDocuments({ ...filter, status: 'OUT_FOR_DELIVERY' }),
      Delivery.countDocuments({ ...filter, status: 'CANCELLED' }),
      Vehicle.countDocuments(filter),
      Vehicle.countDocuments({ ...filter, status: 'AVAILABLE' }),
      Vehicle.countDocuments({ ...filter, status: 'ASSIGNED' }),
      Vehicle.countDocuments({ ...filter, status: 'MAINTENANCE' }),
      Driver.countDocuments(filter),
      Driver.countDocuments({ ...filter, status: 'AVAILABLE' }),
      Driver.countDocuments({ ...filter, status: 'ASSIGNED' }),
      Maintenance.countDocuments({ ...filter, status: 'COMPLETED' }),
      Delivery.aggregate([
        { $match: { ...filter, status: 'DELIVERED' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
      ]),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.status(200).json({
      success: true,
      data: {
        deliveries: {
          total: totalDeliveries,
          delivered: deliveredCount,
          pending: pendingCount,
          assigned: assignedCount,
          outForDelivery: outForDeliveryCount,
          cancelled: cancelledCount,
        },
        vehicles: {
          total: totalVehicles,
          available: vehiclesAvailable,
          assigned: vehiclesAssigned,
          inMaintenance: vehiclesMaintenance,
        },
        drivers: {
          total: totalDrivers,
          available: driversAvailable,
          assigned: driversAssigned,
        },
        maintenance: {
          completed: completedMaintenanceCount,
        },
        financials: {
          totalRevenue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
