/**
 * Central Role Definitions & Authorization Utilities for FleetHub 2.0
 * Exactly 4 Roles:
 * 1. SUPER_ADMIN (Platform Owner, only 1 allowed)
 * 2. ADMIN (Platform Operations Admin, created by SUPER_ADMIN)
 * 3. CLIENT (Restaurant / Business Client, self-registered)
 * 4. DRIVER (Delivery Driver, self-registered or admin-created)
 */

const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  DISPATCHER: 'DISPATCHER',
  CLIENT: 'CLIENT',
  DRIVER: 'DRIVER',

  // Backward compatibility aliases
  CLIENT_ADMIN: 'CLIENT',
  CLIENT_USER: 'CLIENT',
};

// Official valid roles in FleetHub 2.0
const OFFICIAL_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.DISPATCHER,
  ROLES.CLIENT,
  ROLES.DRIVER,
];

// All accepted roles in database schemas (including legacy compatibility)
const ALL_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'DISPATCHER',
  'CLIENT',
  'DRIVER',
  'CLIENT_ADMIN',
  'CLIENT_USER',
];

// Roles permitted for public registration (Section 26: strictly CLIENT only)
const PUBLIC_REGISTRATION_ROLES = [
  ROLES.CLIENT,
];

// Roles forbidden from public registration
const RESTRICTED_PUBLIC_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.DISPATCHER,
  ROLES.DRIVER,
];

/**
 * Check if a role is SUPER_ADMIN (platform owner)
 */
const isSuperAdmin = (role) => {
  return role === ROLES.SUPER_ADMIN;
};

/**
 * Check if a role is ADMIN (platform operations admin)
 */
const isAdmin = (role) => {
  return role === ROLES.ADMIN;
};

/**
 * Check if a role is DISPATCHER (operations dispatch manager)
 */
const isDispatcher = (role) => {
  return role === ROLES.DISPATCHER;
};

/**
 * Check if a role has platform-level admin privileges (SUPER_ADMIN or ADMIN)
 */
const isPlatformAdmin = (role) => {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
};

/**
 * Check if a role has operations dispatch privileges (SUPER_ADMIN, ADMIN, or DISPATCHER)
 */
const isOperations = (role) => {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.ADMIN ||
    role === ROLES.DISPATCHER
  );
};

/**
 * Check if a role is a Client organization role (Restaurant/Cafe)
 */
const isClient = (role) => {
  return (
    role === ROLES.CLIENT ||
    role === 'CLIENT_ADMIN' ||
    role === 'CLIENT_USER'
  );
};

/**
 * Check if a role is a Driver
 */
const isDriver = (role) => {
  return role === ROLES.DRIVER;
};

/**
 * Check if a role is tenant/client scoped (Only CLIENT organizations)
 */
const isClientScoped = (role) => {
  return isClient(role);
};

/**
 * Maps each role to the canonical path for their primary dashboard
 */
const getRoleDashboardPath = (role) => {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return '/super-admin/dashboard';
    case ROLES.ADMIN:
      return '/admin/dashboard';
    case ROLES.DISPATCHER:
      return '/dispatcher/dashboard';
    case ROLES.DRIVER:
      return '/driver/dashboard';
    case ROLES.CLIENT:
    case 'CLIENT_ADMIN':
    case 'CLIENT_USER':
    default:
      return '/client/dashboard';
  }
};

module.exports = {
  ROLES,
  OFFICIAL_ROLES,
  ALL_ROLES,
  PUBLIC_REGISTRATION_ROLES,
  RESTRICTED_PUBLIC_ROLES,
  isSuperAdmin,
  isAdmin,
  isDispatcher,
  isPlatformAdmin,
  isOperations,
  isClient,
  isDriver,
  isClientScoped,
  getRoleDashboardPath,
};
