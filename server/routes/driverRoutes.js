const express = require('express');
const {
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  resetDriverPassword,
  toggleDriverStatus,
  updateAvailability,
  getDriverProfile,
  updateDriverProfile,
  getDriverDeliveries,
} = require('../controllers/driverController');
const { protect, requireRole } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use(protect);
router.use(enforceTenant);

// Driver-specific operations (accessible by DRIVER)
router
  .route('/profile')
  .get(requireRole(ROLES.DRIVER, ROLES.SUPER_ADMIN, ROLES.ADMIN), getDriverProfile)
  .patch(requireRole(ROLES.DRIVER, ROLES.SUPER_ADMIN, ROLES.ADMIN), updateDriverProfile);

router.patch(
  '/availability',
  requireRole(ROLES.DRIVER, ROLES.SUPER_ADMIN, ROLES.ADMIN),
  updateAvailability
);

router.get(
  '/deliveries',
  requireRole(ROLES.DRIVER, ROLES.SUPER_ADMIN, ROLES.ADMIN),
  getDriverDeliveries
);

// Drivers collection endpoints
router
  .route('/')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.DRIVER), getDrivers)
  .post(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), createDriver);

// Individual driver management
router
  .route('/:id')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.DRIVER), getDriver)
  .put(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateDriver)
  .patch(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateDriver)
  .delete(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteDriver);

// Admin driver password reset
router.post(
  '/:id/reset-password',
  requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  resetDriverPassword
);

// Admin driver status toggle (Activate / Deactivate)
router.patch(
  '/:id/status',
  requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  toggleDriverStatus
);

module.exports = router;
