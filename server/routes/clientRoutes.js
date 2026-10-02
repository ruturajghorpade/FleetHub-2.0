const express = require('express');
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} = require('../controllers/clientController');
const { protect, requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT), getClients)
  .post(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), createClient);

router
  .route('/:id')
  .get(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT), getClient)
  .put(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateClient)
  .delete(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteClient);

module.exports = router;
