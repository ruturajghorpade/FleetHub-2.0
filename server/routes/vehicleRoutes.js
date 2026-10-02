const express = require('express');
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController');
const { protect, requireRole } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use(protect);
router.use(enforceTenant);

router
  .route('/')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.DRIVER), getVehicles)
  .post(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), createVehicle);

router
  .route('/:id')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.DRIVER), getVehicle)
  .put(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateVehicle)
  .delete(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteVehicle);

module.exports = router;
