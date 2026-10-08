const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES } = require('../utils/roles');

/**
 * Protect routes - verifies JWT authentication token
 * Also exported as authenticate and authMiddleware
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. No token provided.',
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_SECRET is not configured.',
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact an administrator.',
      });
    }

    // Resolve driverId for DRIVER role
    if (user.role === 'DRIVER') {
      const Driver = require('../models/Driver');
      if (!user.driverId) {
        const driverDoc = await Driver.findOne({
          $or: [
            { userId: user._id },
            { phone: user.phone },
            { email: user.email },
            { name: user.name },
            ...(user.licenseNumber ? [{ licenseNumber: user.licenseNumber }] : []),
          ],
        });
        if (driverDoc) {
          user.driverId = driverDoc._id;
          if (!driverDoc.userId) {
            driverDoc.userId = user._id;
            await driverDoc.save().catch(() => {});
          }
        }
      }

      if (user.driverId) {
        const driverDoc = await Driver.findById(user.driverId);
        if (driverDoc && driverDoc.status === 'INACTIVE') {
          return res.status(403).json({
            success: false,
            message: 'Your account is inactive. Please contact an administrator.',
          });
        }
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Invalid or expired token.',
    });
  }
};

/**
 * Role-based authorization middleware
 * Also exported as authorize, roleMiddleware
 *
 * Example:
 * requireRole("SUPER_ADMIN")
 * requireRole("ADMIN", "SUPER_ADMIN")
 * requireRole("CLIENT")
 * requireRole("DRIVER")
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated. User session missing.',
      });
    }

    const userRole = req.user.role;

    // Direct role match
    if (roles.includes(userRole)) {
      return next();
    }

    // Support legacy client sub-roles mapping to CLIENT
    if (
      roles.includes(ROLES.CLIENT) &&
      ['CLIENT_ADMIN', 'CLIENT_USER'].includes(userRole)
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You are not authorized to access this resource.',
    });
  };
};

const authenticate = protect;
const authorize = requireRole;
const authMiddleware = protect;
const roleMiddleware = requireRole;

module.exports = {
  protect,
  authenticate,
  authorize,
  requireRole,
  authMiddleware,
  roleMiddleware,
};
