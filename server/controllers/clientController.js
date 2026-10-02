const Client = require('../models/Client');
const Branch = require('../models/Branch');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Delivery = require('../models/Delivery');
const { isClient } = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');

const {
  validateName,
  validateEmail,
  validatePhone,
  validateAddress,
  validatePincode,
  validateEnum,
  sendValidationError,
} = require('../utils/validation');

// @desc    Get all clients (or current client for CLIENT role)
// @route   GET /api/v1/clients or GET /api/clients
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.getClients = async (req, res, next) => {
  try {
    let query = {};
    if (isClient(req.user.role)) {
      query._id = req.user.clientId;
    }

    const clients = await Client.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single client
// @route   GET /api/v1/clients/:id or GET /api/clients/:id
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.getClient = async (req, res, next) => {
  try {
    if (isClient(req.user.role) && req.user.clientId.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to other client details.',
      });
    }

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new client
// @route   POST /api/v1/clients or POST /api/clients
// @access  Private (SUPER_ADMIN, ADMIN)
exports.createClient = async (req, res, next) => {
  try {
    const { name, email, phone, address, contactPerson, city, state, pincode, status } = req.body;
    const errors = {};

    const nameCheck = validateName(name, 'Client name', 2, 100);
    if (!nameCheck.isValid) errors.name = nameCheck.error;

    const emailCheck = validateEmail(email, 'Client email');
    if (!emailCheck.isValid) errors.email = emailCheck.error;

    const phoneCheck = validatePhone(phone, 'Contact phone number');
    if (!phoneCheck.isValid) errors.phone = phoneCheck.error;

    const addressCheck = validateAddress(address, 'Client address');
    if (!addressCheck.isValid) errors.address = addressCheck.error;

    if (pincode && String(pincode).trim()) {
      const pinCheck = validatePincode(pincode, 'Pincode');
      if (!pinCheck.isValid) errors.pincode = pinCheck.error;
    }

    if (status) {
      const statusCheck = validateEnum(status, ['ACTIVE', 'INACTIVE'], 'Status');
      if (!statusCheck.isValid) errors.status = statusCheck.error;
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    const cleanEmail = emailCheck.value;
    const cleanPhone = phoneCheck.value;

    const existingClient = await Client.findOne({ email: cleanEmail });
    if (existingClient) {
      return sendValidationError(
        res,
        { email: 'An account with this email already exists.' },
        'An account with this email already exists.'
      );
    }

    const client = await Client.create({
      name: nameCheck.value,
      email: cleanEmail,
      phone: cleanPhone,
      address: addressCheck.value,
      contactPerson: contactPerson ? contactPerson.trim() : undefined,
      city: city ? city.trim() : undefined,
      state: state ? state.trim() : undefined,
      pincode: pincode ? String(pincode).trim() : undefined,
      status: status || 'ACTIVE',
    });

    await recordAuditLog({
      req,
      action: 'Client created',
      resource: 'Client',
      resourceId: client._id,
      details: `Created client organization: ${client.name}`,
    });

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update client
// @route   PUT /api/v1/clients/:id or PUT /api/clients/:id
// @access  Private (SUPER_ADMIN, ADMIN)
exports.updateClient = async (req, res, next) => {
  try {
    let client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const { name, email, phone, address, status } = req.body;
    const errors = {};
    const updates = {};

    if (name !== undefined) {
      const nameCheck = validateName(name, 'Client name', 2, 100);
      if (!nameCheck.isValid) errors.name = nameCheck.error;
      else updates.name = nameCheck.value;
    }

    if (email !== undefined) {
      const emailCheck = validateEmail(email, 'Client email');
      if (!emailCheck.isValid) {
        errors.email = emailCheck.error;
      } else {
        const cleanEmail = emailCheck.value;
        const existing = await Client.findOne({ email: cleanEmail, _id: { $ne: client._id } });
        if (existing) {
          errors.email = 'An account with this email already exists.';
        } else {
          updates.email = cleanEmail;
        }
      }
    }

    if (phone !== undefined) {
      const phoneCheck = validatePhone(phone, 'Contact phone number');
      if (!phoneCheck.isValid) errors.phone = phoneCheck.error;
      else updates.phone = phoneCheck.value;
    }

    if (address !== undefined) {
      const addressCheck = validateAddress(address, 'Client address');
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

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    client = await Client.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    await recordAuditLog({
      req,
      action: 'Client updated',
      resource: 'Client',
      resourceId: client._id,
      details: `Updated client: ${client.name}`,
    });

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete client
// @route   DELETE /api/v1/clients/:id or DELETE /api/clients/:id
// @access  Private (SUPER_ADMIN, ADMIN)
exports.deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Clean up dependent resources
    await Branch.deleteMany({ clientId: client._id });
    await Vehicle.deleteMany({ clientId: client._id });
    await Driver.deleteMany({ clientId: client._id });
    await Delivery.deleteMany({ clientId: client._id });
    await client.deleteOne();

    await recordAuditLog({
      req,
      action: 'Client deleted',
      resource: 'Client',
      resourceId: client._id,
      details: `Deleted client: ${client.name} and associated branches, fleet, and drivers`,
    });

    res.status(200).json({
      success: true,
      message: 'Client and associated data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
