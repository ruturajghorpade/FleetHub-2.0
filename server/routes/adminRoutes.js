const express = require('express');
const {
  getAdmins,
  getAdmin,
  createAdmin,
  updateAdmin,
  updateAdminStatus,
  resetAdminPassword,
  deleteAdmin,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/roles');

const router = express.Router();

// Strict security: Only SUPER_ADMIN can access Admin Management APIs
router.use(protect);
router.use(requireRole(ROLES.SUPER_ADMIN));

router.route('/')
  .get(getAdmins)
  .post(createAdmin);

router.route('/:id')
  .get(getAdmin)
  .put(updateAdmin)
  .delete(deleteAdmin);

router.patch('/:id/status', updateAdminStatus);
router.patch('/:id/password', resetAdminPassword);

module.exports = router;
