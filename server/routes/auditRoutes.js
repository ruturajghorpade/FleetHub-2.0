const express = require('express');
const { getAuditLogs } = require('../controllers/auditController');
const { protect, requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use(protect);
router.use(requireRole(ROLES.SUPER_ADMIN));

router.get('/', getAuditLogs);

module.exports = router;
