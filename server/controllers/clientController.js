const Client = require('../models/Client');
const Branch = require('../models/Branch');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Delivery = require('../models/Delivery');
const { isClient } = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');

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
    const { name, email, phone, address, status } = req.body;

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({ success: false, message: 'Client with this email already exists' });
    }

    const client = await Client.create({
      name,
      email,
      phone,
      address,
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

    client = await Client.findByIdAndUpdate(req.params.id, req.body, {
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
