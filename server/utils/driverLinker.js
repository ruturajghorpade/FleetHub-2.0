const Driver = require('../models/Driver');

/**
 * Resolves or links the Driver document associated with a User account.
 * Handles backward compatibility, linking user._id <-> driver._id bidirectionally.
 *
 * @param {Object} user - User document or req.user
 * @returns {Promise<Object|null>} driver._id
 */
const getLinkedDriverId = async (user) => {
  if (!user || user.role !== 'DRIVER') return null;
  if (user.driverId) {
    return user.driverId._id || user.driverId;
  }

  const driver = await Driver.findOne({
    $or: [
      { userId: user._id },
      { email: user.email },
      { phone: user.phone },
      { name: user.name },
      ...(user.licenseNumber ? [{ licenseNumber: user.licenseNumber }] : []),
    ],
  });

  if (driver) {
    let shouldSaveDriver = false;
    if (!driver.userId) {
      driver.userId = user._id;
      shouldSaveDriver = true;
    }
    if (!driver.email && user.email) {
      driver.email = user.email;
      shouldSaveDriver = true;
    }
    if (shouldSaveDriver && typeof driver.save === 'function') {
      await driver.save().catch(() => {});
    }

    user.driverId = driver._id;
    if (typeof user.save === 'function') {
      await user.save().catch(() => {});
    }
    return driver._id;
  }

  return null;
};

/**
 * Resolves the full Driver document linked to a user.
 *
 * @param {Object} user - User document or req.user
 * @returns {Promise<Object|null>} Driver document
 */
const getLinkedDriver = async (user) => {
  if (!user || user.role !== 'DRIVER') return null;
  const driverId = await getLinkedDriverId(user);
  if (!driverId) return null;
  return await Driver.findById(driverId);
};

module.exports = {
  getLinkedDriverId,
  getLinkedDriver,
};
