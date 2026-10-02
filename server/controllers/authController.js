const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const Branch = require('../models/Branch');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Invitation = require('../models/Invitation');
const {
  ROLES,
  PUBLIC_REGISTRATION_ROLES,
  RESTRICTED_PUBLIC_ROLES,
  isPlatformAdmin,
  isClientScoped,
} = require('../utils/roles');
const { recordAuditLog } = require('../utils/auditLogger');
const {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  validateAddress,
  sendValidationError,
} = require('../utils/validation');

// Helper to sign JWT and return sanitized user response (never exposes password hash)
const sendTokenResponse = (user, statusCode, res) => {
  const clientIdVal =
    user.clientId && user.clientId._id ? user.clientId._id : user.clientId;
  const branchIdVal =
    user.branchId && user.branchId._id ? user.branchId._id : user.branchId;

  const token = jwt.sign(
    {
      id: user._id,
      userId: user._id,
      role: user.role,
      clientId: clientIdVal || null,
      branchId: branchIdVal || null,
    },
    process.env.JWT_SECRET || 'fleethub_super_secret_jwt_key_2026_mca_project',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status || 'ACTIVE',
      clientId: clientIdVal || null,
      client: user.clientId && user.clientId._id ? user.clientId : null,
      branchId: branchIdVal || null,
      licenseNumber: user.licenseNumber || '',
      vehicleType: user.vehicleType || '',
      vehicleModel: user.vehicleModel || '',
      vehicleNumber: user.vehicleNumber || '',
    },
  });
};

// @desc    Register a user (Public Registration for CLIENT and DRIVER only)
// @route   POST /api/v1/auth/register or POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      role = 'CLIENT',
      // Client fields
      companyName,
      clientName,
      address,
      clientAddress,
      branchName,
      branchAddress,
      // Driver fields
      licenseNumber,
      licenseExpiry,
      vehicleType,
      vehicleModel,
      vehicleNumber,
    } = req.body;

    // 1. Comprehensive input validation
    const errors = {};

    const nameCheck = validateName(name, 'Full name');
    if (!nameCheck.isValid) errors.name = nameCheck.error;

    const emailCheck = validateEmail(email, 'Email address');
    if (!emailCheck.isValid) errors.email = emailCheck.error;

    const passwordCheck = validatePassword(password, 'Password');
    if (!passwordCheck.isValid) errors.password = passwordCheck.error;

    if (confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (phone && phone.trim()) {
      const phoneCheck = validatePhone(phone, 'Phone number');
      if (!phoneCheck.isValid) errors.phone = phoneCheck.error;
    }

    const targetRole = role === 'CLIENT_ADMIN' ? 'CLIENT' : role;

    if (targetRole === 'CLIENT') {
      const orgName = companyName || clientName;
      if (!orgName || !orgName.trim()) {
        errors.clientName = 'Restaurant / Business name is required.';
      } else if (orgName.trim().length < 2 || orgName.trim().length > 100) {
        errors.clientName = 'Restaurant / Business name must be between 2 and 100 characters.';
      }

      const orgAddress = address || clientAddress;
      if (orgAddress && orgAddress.trim()) {
        const addrCheck = validateAddress(orgAddress, 'Business address');
        if (!addrCheck.isValid) errors.clientAddress = addrCheck.error;
      }
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    // 2. Strict Role Security: The backend NEVER trusts frontend role values for privileged roles
    if (role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'SUPER_ADMIN registration is not available.',
      });
    }

    if (role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'ADMIN accounts can only be created by SUPER_ADMIN.',
      });
    }

    if (role === 'DISPATCHER') {
      return res.status(403).json({
        success: false,
        message: 'DISPATCHER accounts can only be created by FleetHub administrators.',
      });
    }

    if (role === 'DRIVER') {
      return res.status(403).json({
        success: false,
        message: 'DRIVER accounts are internal FleetHub resources and cannot be registered publicly.',
      });
    }

    // targetRole already defined above
    if (!PUBLIC_REGISTRATION_ROLES.includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid registration role '${role}'. Only CLIENT registration is permitted.`,
      });
    }

    // 3. Check for existing user with this email
    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please sign in or use another email address.',
      });
    }

    let assignedClientId = null;
    let assignedBranchId = null;

    // 4. Role-Specific Business Logic
    if (targetRole === 'CLIENT') {
      const orgName = (companyName || clientName || `${name.trim()}'s Kitchen`).trim();
      const orgAddress = (address || clientAddress || 'Main Outlet Address').trim();

      // Create or locate the Client entity
      let client = await Client.findOne({ email: cleanEmail });
      if (!client) {
        client = await Client.create({
          name: orgName,
          email: cleanEmail,
          phone: phone ? phone.trim() : 'N/A',
          address: orgAddress,
          status: 'ACTIVE',
        });
      } else {
        client.name = orgName;
        if (phone) client.phone = phone.trim();
        client.address = orgAddress;
        await client.save();
      }

      assignedClientId = client._id;

      // Automatically create the initial default branch
      const bName = (branchName || `${orgName} Main Branch`).trim();
      const bAddr = (branchAddress || orgAddress).trim();

      let branch = await Branch.findOne({ clientId: client._id });
      if (!branch) {
        branch = await Branch.create({
          name: bName,
          clientId: client._id,
          address: bAddr,
          phone: phone ? phone.trim() : 'N/A',
          status: 'ACTIVE',
        });
      }
      assignedBranchId = branch._id;
    } else if (targetRole === 'DRIVER') {
      const cleanLicense = (licenseNumber || '').trim().toUpperCase();

      if (!cleanLicense) {
        return res.status(400).json({
          success: false,
          message: 'Driving license number is required for driver registration.',
        });
      }

      const existingDriverRecord = await Driver.findOne({ licenseNumber: cleanLicense });
      if (existingDriverRecord) {
        return res.status(400).json({
          success: false,
          message: `A driver with license number '${cleanLicense}' is already registered.`,
        });
      }

      // Associate with an existing active client organization if present in database
      const defaultClient =
        (await Client.findOne({ status: 'ACTIVE' })) || (await Client.findOne());
      if (defaultClient) {
        assignedClientId = defaultClient._id;
        const defaultBranch = await Branch.findOne({ clientId: defaultClient._id });
        if (defaultBranch) {
          assignedBranchId = defaultBranch._id;
        }
      }
    }

    // 5. Create User account in MongoDB `users` collection
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      password,
      role: targetRole,
      status: 'ACTIVE',
      clientId: assignedClientId,
      branchId: assignedBranchId,
      licenseNumber: licenseNumber ? licenseNumber.trim().toUpperCase() : '',
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      vehicleType: vehicleType ? vehicleType.trim() : '',
      vehicleModel: vehicleModel ? vehicleModel.trim() : '',
      vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : '',
    });

    // 6. For DRIVER: create Driver operational record so driver is available for dispatch
    if (targetRole === 'DRIVER' && assignedClientId && assignedBranchId) {
      const cleanLicense = (licenseNumber || `DL-${Date.now().toString().slice(-6)}`).toUpperCase().trim();
      const existingDriver = await Driver.findOne({
        $or: [{ licenseNumber: cleanLicense }, { phone: newUser.phone }],
      });

      if (!existingDriver) {
        await Driver.create({
          clientId: assignedClientId,
          branchId: assignedBranchId,
          name: newUser.name,
          phone: newUser.phone || 'N/A',
          licenseNumber: cleanLicense,
          status: 'AVAILABLE',
        });
      }

      // If driver registered their own vehicle, record it
      if (vehicleNumber && vehicleType) {
        const cleanVNum = vehicleNumber.trim().toUpperCase();
        const existingVehicle = await Vehicle.findOne({ vehicleNumber: cleanVNum });
        if (!existingVehicle) {
          await Vehicle.create({
            vehicleNumber: cleanVNum,
            vehicleType: ['BIKE', 'SCOOTER', 'CAR', 'VAN'].includes(vehicleType.toUpperCase())
              ? vehicleType.toUpperCase()
              : 'BIKE',
            model: vehicleModel ? vehicleModel.trim() : 'Standard Vehicle',
            clientId: assignedClientId,
            branchId: assignedBranchId,
            status: 'AVAILABLE',
          });
        }
      }
    }

    // 7. Audit log the registration
    const auditAction = targetRole === 'CLIENT' ? 'Client created' : 'Driver created';
    await recordAuditLog({
      req,
      userId: newUser._id,
      userName: newUser.name,
      userEmail: newUser.email,
      role: newUser.role,
      action: auditAction,
      resource: 'User',
      resourceId: newUser._id,
      details: `Public registration completed as ${targetRole}`,
    });

    sendTokenResponse(newUser, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login or POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const errors = {};

    if (!email || !email.trim()) {
      errors.email = 'Email is required.';
    } else {
      const emailCheck = validateEmail(email, 'Email address');
      if (!emailCheck.isValid) errors.email = emailCheck.error;
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Query user and explicitly select password for verification
    const user = await User.findOne({ email: cleanEmail })
      .select('+password')
      .populate('clientId', 'name email status address phone')
      .populate('branchId', 'name address phone');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check account status
    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact an administrator.',
      });
    }

    // Verify password hash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Record login audit log
    await recordAuditLog({
      req,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      action: 'Login',
      resource: 'Session',
      resourceId: user._id,
      details: `User signed in successfully from ${req.ip || 'remote'}`,
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout or POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await recordAuditLog({
        req,
        userId: req.user._id,
        userName: req.user.name,
        userEmail: req.user.email,
        role: req.user.role,
        action: 'Logout',
        resource: 'Session',
        resourceId: req.user._id,
        details: 'User logged out',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me or GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('clientId', 'name email phone address status')
      .populate('branchId', 'name address phone');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile (Users cannot change their own role)
// @route   PUT /api/v1/auth/profile or PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const errors = {};

    if (req.body.name !== undefined) {
      const nameCheck = validateName(req.body.name, 'Full name');
      if (!nameCheck.isValid) errors.name = nameCheck.error;
      else user.name = nameCheck.value;
    }

    if (req.body.phone !== undefined && req.body.phone !== '') {
      const phoneCheck = validatePhone(req.body.phone, 'Phone number');
      if (!phoneCheck.isValid) errors.phone = phoneCheck.error;
      else user.phone = phoneCheck.value;
    }

    if (req.body.email && req.body.email.toLowerCase().trim() !== user.email) {
      const emailCheck = validateEmail(req.body.email, 'Email address');
      if (!emailCheck.isValid) {
        errors.email = emailCheck.error;
      } else {
        const cleanEmail = emailCheck.value;
        const existing = await User.findOne({ email: cleanEmail });
        if (existing && existing._id.toString() !== user._id.toString()) {
          errors.email = 'Email is already in use by another account.';
        } else {
          user.email = cleanEmail;
        }
      }
    }

    // Change Password if provided
    if (req.body.password && req.body.password.trim()) {
      const passCheck = validatePassword(req.body.password, 'New password');
      if (!passCheck.isValid) {
        errors.password = passCheck.error;
      } else {
        user.password = passCheck.value;
      }
    }

    if (Object.keys(errors).length > 0) {
      return sendValidationError(res, errors, Object.values(errors)[0]);
    }

    // Role cannot be modified from the profile endpoint
    await user.save();

    await recordAuditLog({
      req,
      action: 'Profile updated',
      resource: 'User',
      resourceId: user._id,
      details: 'User updated personal profile',
    });

    const updated = await User.findById(user._id)
      .populate('clientId', 'name email status')
      .populate('branchId', 'name address');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tenant-isolated users
// @route   GET /api/v1/auth/users or GET /api/auth/users
// @access  Private (SUPER_ADMIN, ADMIN, CLIENT)
exports.getUsers = async (req, res, next) => {
  try {
    const filter = {};

    if (isClientScoped(req.user.role)) {
      filter.clientId = req.user.clientId;
    } else if (isPlatformAdmin(req.user.role) && req.query.clientId) {
      filter.clientId = req.query.clientId;
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('clientId', 'name email status')
      .populate('branchId', 'name address')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active clients for public client list / dropdown
// @route   GET /api/v1/auth/clients or GET /api/auth/clients
// @access  Public
exports.getPublicClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ status: 'ACTIVE' })
      .select('_id name email')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    next(error);
  }
};
