const express = require('express');
const {
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
} = require('../controllers/driverController');
const { protect, requireRole } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use(protect);
router.use(enforceTenant);

router
  .route('/')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.DRIVER), getDrivers)
  .post(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), createDriver);

router
  .route('/:id')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.DRIVER), getDriver)
  .put(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateDriver)
  .patch(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateDriver)
  .delete(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteDriver);

module.exports = router;
