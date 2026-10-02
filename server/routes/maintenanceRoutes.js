const express = require('express');
const {
  getMaintenances,
  getMaintenance,
  createMaintenance,
  updateMaintenance,
  completeMaintenance,
} = require('../controllers/maintenanceController');
const { protect, requireRole } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use(protect);
router.use(enforceTenant);

router
  .route('/')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), getMaintenances)
  .post(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), createMaintenance);

router
  .route('/:id')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), getMaintenance)
  .put(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateMaintenance);

router
  .route('/:id/complete')
  .patch(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), completeMaintenance);

module.exports = router;
