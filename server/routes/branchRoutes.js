const express = require('express');
const {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
} = require('../controllers/branchController');
const { protect, requireRole } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use(protect);
router.use(enforceTenant);

router
  .route('/')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT), getBranches)
  .post(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT), createBranch);

router
  .route('/:id')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT), getBranch)
  .put(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT), updateBranch)
  .delete(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT), deleteBranch);

module.exports = router;
