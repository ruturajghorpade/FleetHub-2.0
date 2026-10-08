const express = require('express');
const { getDashboardStats, getReports } = require('../controllers/reportController');
const { protect, requireRole } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use(protect);
router.use(enforceTenant);

router.get(
  '/dashboard',
  requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.CLIENT, ROLES.DRIVER),
  getDashboardStats
);

router.get(
  '/analytics',
  requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT),
  getReports
);

module.exports = router;
