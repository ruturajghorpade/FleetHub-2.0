const express = require('express');
const {
  getDeliveries,
  getDelivery,
  createDelivery,
  assignDelivery,
  acceptDelivery,
  rejectDelivery,
  updateDeliveryStatus,
  cancelDelivery,
  markWaitingForDriver,
} = require('../controllers/deliveryController');
const { protect, requireRole } = require('../middleware/auth');
const { enforceTenant } = require('../middleware/tenant');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.use(protect);
router.use(enforceTenant);

// Deliveries base endpoints
router
  .route('/')
  .get(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.CLIENT, ROLES.DRIVER),
    getDeliveries
  )
  .post(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT),
    createDelivery
  );

// Pending deliveries convenience endpoint for operations
router
  .route('/pending')
  .get(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER),
    (req, res, next) => {
      req.query.status = 'REQUESTED,WAITING_FOR_DRIVER,PENDING,DRIVER_REJECTED,ASSIGNMENT_FAILED';
      return getDeliveries(req, res, next);
    }
  );

router
  .route('/:id')
  .get(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.CLIENT, ROLES.DRIVER),
    getDelivery
  );

// Dispatcher Assignment & Reassignment (CLIENT is strictly forbidden with 403)
router
  .route('/:id/assign')
  .patch(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER),
    assignDelivery
  );

router
  .route('/:id/reassign')
  .patch(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER),
    assignDelivery
  );

router
  .route('/:id/waiting')
  .patch(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER),
    markWaitingForDriver
  );

// Driver Accept & Reject
router
  .route('/:id/accept')
  .patch(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DRIVER),
    acceptDelivery
  );

router
  .route('/:id/reject')
  .patch(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DRIVER),
    rejectDelivery
  );

// Status Pipeline update (CLIENT is strictly forbidden with 403)
router
  .route('/:id/status')
  .patch(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.DRIVER),
    updateDeliveryStatus
  );

// Cancellation (CLIENT, SUPER_ADMIN, ADMIN, DISPATCHER)
router
  .route('/:id/cancel')
  .patch(
    requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.CLIENT),
    cancelDelivery
  );

module.exports = router;
