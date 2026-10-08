const AuditLog = require('../models/AuditLog');
const { sanitizeSearchQuery } = require('../utils/validation');

// @desc    Get system audit logs
// @route   GET /api/v1/audit-logs or GET /api/audit-logs
// @access  Private (SUPER_ADMIN only)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.action) {
      filter.action = req.query.action;
    }

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.resource) {
      filter.resource = req.query.resource;
    }

    if (req.query.search) {
      const cleanSearch = sanitizeSearchQuery(req.query.search);
      if (cleanSearch) {
        filter.$or = [
          { userName: { $regex: cleanSearch, $options: 'i' } },
          { userEmail: { $regex: cleanSearch, $options: 'i' } },
          { action: { $regex: cleanSearch, $options: 'i' } },
          { details: { $regex: cleanSearch, $options: 'i' } },
        ];
      }
    }

    const limit = parseInt(req.query.limit, 10) || 100;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};
