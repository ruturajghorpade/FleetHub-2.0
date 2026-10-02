const Notification = require('../models/Notification');

/**
 * Helper to record system / operational notifications
 */
const createNotification = async ({ clientId = null, driverId = null, title, message, type = 'SYSTEM' }) => {
  try {
    const notif = await Notification.create({
      clientId,
      driverId,
      title,
      message,
      type,
    });
    return notif;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

module.exports = { createNotification };
