const AuditLog = require('../models/AuditLog');

/**
 * Helper to record an audit trail event
 */
const recordAuditLog = async ({
  req = null,
  userId = null,
  userName = '',
  userEmail = '',
  role = '',
  action,
  resource,
  resourceId = null,
  details = '',
}) => {
  try {
    let finalUserId = userId;
    let finalUserName = userName;
    let finalUserEmail = userEmail;
    let finalRole = role;
    let ipAddress = '';

    if (req) {
      if (req.user) {
        finalUserId = finalUserId || req.user._id || req.user.id;
        finalUserName = finalUserName || req.user.name;
        finalUserEmail = finalUserEmail || req.user.email;
        finalRole = finalRole || req.user.role;
      }
      ipAddress =
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        '';
    }

    await AuditLog.create({
      userId: finalUserId || null,
      userName: finalUserName || 'System',
      userEmail: finalUserEmail || '',
      role: finalRole || 'SYSTEM',
      action,
      resource,
      resourceId: resourceId ? resourceId.toString() : null,
      details,
      ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : '',
    });
  } catch (err) {
    // Non-blocking: log error to console without breaking main request flow
    console.error('AuditLog Error:', err.message);
  }
};

module.exports = { recordAuditLog };
