const Notification = require('../models/Notification');

// @desc    Get notifications for user/client
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    let filter = {};
    const { role } = req.user;

    if (role === 'CLIENT' || role === 'CLIENT_USER') {
      filter.clientId = req.user.clientId;
    } else if (role === 'DRIVER') {
      const driverId = req.user.driverId || req.user._id;
      filter.driverId = driverId;
    } else if (role === 'DISPATCHER') {
      if (req.user.clientId) {
        filter.clientId = req.user.clientId;
      }
    } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      if (req.query.clientId) {
        filter.clientId = req.query.clientId;
      }
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      ...filter,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const { role } = req.user;
    if (role === 'CLIENT' || role === 'CLIENT_USER') {
      if (!req.user.clientId || !notification.clientId || notification.clientId.toString() !== req.user.clientId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this notification' });
      }
    } else if (role === 'DRIVER') {
      const driverId = (req.user.driverId || req.user._id).toString();
      if (!notification.driverId || notification.driverId.toString() !== driverId) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this notification' });
      }
    } else if (role === 'DISPATCHER') {
      if (req.user.clientId && (!notification.clientId || notification.clientId.toString() !== req.user.clientId.toString())) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this notification' });
      }
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    let filter = {};
    const { role } = req.user;

    if (role === 'CLIENT' || role === 'CLIENT_USER') {
      if (!req.user.clientId) {
        return res.status(400).json({ success: false, message: 'No client associated with user' });
      }
      filter.clientId = req.user.clientId;
    } else if (role === 'DRIVER') {
      const driverId = req.user.driverId || req.user._id;
      filter.driverId = driverId;
    } else if (role === 'DISPATCHER') {
      if (req.user.clientId) {
        filter.clientId = req.user.clientId;
      } else {
        filter.driverId = null;
      }
    } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      filter.clientId = null;
      filter.driverId = null;
    }

    await Notification.updateMany(filter, { isRead: true });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};
