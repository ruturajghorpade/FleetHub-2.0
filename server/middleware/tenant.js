const { isPlatformAdmin, isClientScoped, isClient, isDriver } = require('../utils/roles');

/**
 * Tenant isolation middleware.
 * Injects tenant-scoping query filters onto req.tenantFilter
 * so all queries automatically restrict access to the authenticated client's records.
 */
const enforceTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthenticated' });
  }

  // SUPER_ADMIN, ADMIN, and DISPATCHER are FleetHub operations: can view all records or filter by query param
  if (isPlatformAdmin(req.user.role) || req.user.role === 'DISPATCHER') {
    req.tenantFilter = req.query.clientId ? { clientId: req.query.clientId } : {};
    return next();
  }

  // CLIENT role: strictly scoped to own client organization
  if (isClient(req.user.role)) {
    if (!req.user.clientId) {
      return res.status(400).json({
        success: false,
        message: 'Your client account is not properly linked to an organization.',
      });
    }
    const cId = req.user.clientId._id || req.user.clientId;
    req.tenantFilter = { clientId: cId };
    return next();
  }

  // DRIVER role: FleetHub multi-client resource. Operations are scoped by driverId.
  if (isDriver(req.user.role)) {
    req.tenantFilter = {};
    return next();
  }

  req.tenantFilter = {};
  next();
};

module.exports = { enforceTenant };
