const express = require('express');
const {
  register,
  login,
  getMe,
  getUsers,
  getPublicClients,
  updateProfile,
  logout,
  changePassword,
} = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../utils/roles');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/clients', getPublicClients);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, authLimiter, changePassword);
router.post('/logout', protect, logout);

// Users list (tenant-scoped)
router.get(
  '/users',
  protect,
  requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CLIENT),
  getUsers
);

module.exports = router;
