const Branch = require('../models/Branch');
const Client = require('../models/Client');
const { isClient } = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');
const {
  validateName,
  validatePhone,
  validateAddress,
  validatePincode,
  validateEnum,
  sendValidationError,
} = require('../utils/validation');

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
    const { name, address, phone, contactPerson, city, state, pincode, status } = req.body;
    let clientId = req.body.clientId;

    if (isClient(req.user.role)) {
      clientId = req.user.clientId;
    }

    const errors = {};

    const nameCheck = validateName(name, 'Branch name', 2, 100);
    if (!nameCheck.isValid) errors.name = nameCheck.error;

    const phoneCheck = validatePhone(phone, 'Branch phone number');
    if (!phoneCheck.isValid) errors.phone = phoneCheck.error;

    const addressCheck = validateAddress(address, 'Branch address');
    if (!addressCheck.isValid) errors.address = addressCheck.error;

    if (pincode && String(pincode).trim()) {
      const pinCheck = validatePincode(pincode, 'Pincode');
      if (!pinCheck.isValid) errors.pincode = pinCheck.error;
    }

    if (!clientId) {
      errors.clientId = 'Client ID is required.';
    }

    if (status) {
      const statusCheck = validateEnum(status, ['ACTIVE', 'INACTIVE'], 'Status');
      if (!statusCheck.isValid) errors.status = statusCheck.error;
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return sendValidationError(res, { clientId: 'Client not found.' }, 'Client not found.');
    }

    const branch = await Branch.create({
      name: nameCheck.value,
      clientId,
      address: addressCheck.value,
      phone: phoneCheck.value,
      contactPerson: contactPerson ? contactPerson.trim() : undefined,
      city: city ? city.trim() : undefined,
      state: state ? state.trim() : undefined,
      pincode: pincode ? String(pincode).trim() : undefined,
      status: status || 'ACTIVE',
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

    const { name, address, phone, status } = req.body;
    const errors = {};
    const updates = {};

    if (name !== undefined) {
      const nameCheck = validateName(name, 'Branch name', 2, 100);
      if (!nameCheck.isValid) errors.name = nameCheck.error;
      else updates.name = nameCheck.value;
    }

    if (phone !== undefined) {
      const phoneCheck = validatePhone(phone, 'Branch phone number');
      if (!phoneCheck.isValid) errors.phone = phoneCheck.error;
      else updates.phone = phoneCheck.value;
    }

    if (address !== undefined) {
      const addressCheck = validateAddress(address, 'Branch address');
      if (!addressCheck.isValid) errors.address = addressCheck.error;
      else updates.address = addressCheck.value;
    }

    if (req.body.pincode !== undefined) {
      if (req.body.pincode && String(req.body.pincode).trim()) {
        const pinCheck = validatePincode(req.body.pincode, 'Pincode');
        if (!pinCheck.isValid) errors.pincode = pinCheck.error;
        else updates.pincode = pinCheck.value;
      } else {
        updates.pincode = '';
      }
    }

    if (req.body.contactPerson !== undefined) updates.contactPerson = req.body.contactPerson.trim();
    if (req.body.city !== undefined) updates.city = req.body.city.trim();
    if (req.body.state !== undefined) updates.state = req.body.state.trim();

    if (status !== undefined) {
      const statusCheck = validateEnum(status, ['ACTIVE', 'INACTIVE'], 'Status');
      if (!statusCheck.isValid) errors.status = statusCheck.error;
      else updates.status = statusCheck.value;
    }

    // Clients cannot change the clientId of a branch
    if (!isClient(req.user.role) && req.body.clientId) {
      const client = await Client.findById(req.body.clientId);
      if (!client) {
        errors.clientId = 'Client not found.';
      } else {
        updates.clientId = req.body.clientId;
      }
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    branch = await Branch.findByIdAndUpdate(req.params.id, updates, {
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
