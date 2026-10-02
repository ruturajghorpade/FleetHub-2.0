const Branch = require('../models/Branch');
const { isClient } = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Get all branches (tenant isolated)
// @route   GET /api/v1/branches or GET /api/branches
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.getBranches = async (req, res, next) => {
  try {
    const filter = {};

    // For CLIENT, strictly enforce authenticated user's clientId
    if (isClient(req.user.role)) {
      if (!req.user.clientId) {
        return res.status(403).json({
          success: false,
          message: 'Client account is not linked to any organization.',
        });
      }
      filter.clientId = req.user.clientId;
    } else if (req.query.clientId) {
      filter.clientId = req.query.clientId;
    }

    const branches = await Branch.find(filter)
      .populate('clientId', 'name email status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single branch
// @route   GET /api/v1/branches/:id or GET /api/branches/:id
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.getBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('clientId', 'name email');
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    if (isClient(req.user.role)) {
      const branchClientId = (branch.clientId._id || branch.clientId).toString();
      if (branchClientId !== req.user.clientId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this branch' });
      }
    }

    res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create branch
// @route   POST /api/v1/branches or POST /api/branches
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.createBranch = async (req, res, next) => {
  try {
    let clientId = req.body.clientId;

    if (isClient(req.user.role)) {
      clientId = req.user.clientId;
    }

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }

    const branch = await Branch.create({
      name: req.body.name,
      clientId,
      address: req.body.address,
      phone: req.body.phone,
      status: req.body.status || 'ACTIVE',
    });

    await recordAuditLog({
      req,
      action: 'Branch created',
      resource: 'Branch',
      resourceId: branch._id,
      details: `Created branch: ${branch.name}`,
    });

    const populatedBranch = await Branch.findById(branch._id).populate('clientId', 'name email');

    res.status(201).json({
      success: true,
      data: populatedBranch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update branch
// @route   PUT /api/v1/branches/:id or PUT /api/branches/:id
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.updateBranch = async (req, res, next) => {
  try {
    let branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    if (isClient(req.user.role)) {
      const branchClientId = (branch.clientId._id || branch.clientId).toString();
      if (branchClientId !== req.user.clientId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this branch' });
      }
    }

    branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('clientId', 'name email');

    await recordAuditLog({
      req,
      action: 'Branch updated',
      resource: 'Branch',
      resourceId: branch._id,
      details: `Updated branch: ${branch.name}`,
    });

    res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete branch
// @route   DELETE /api/v1/branches/:id or DELETE /api/branches/:id
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    if (isClient(req.user.role)) {
      const branchClientId = (branch.clientId._id || branch.clientId).toString();
      if (branchClientId !== req.user.clientId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this branch' });
      }
    }

    await branch.deleteOne();

    await recordAuditLog({
      req,
      action: 'Branch deleted',
      resource: 'Branch',
      resourceId: branch._id,
      details: `Deleted branch: ${branch.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'Branch deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
