/**
 * FleetHub 2.0 - Frontend Validation Utility
 * Reusable validation functions and input formatters
 */

export const PHONE_REGEX = /^[6-9][0-9]{9}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,49}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Validate phone number (Indian standard: exactly 10 digits starting with 6, 7, 8, 9)
 */
export const validatePhone = (phone, fieldName = 'Phone number') => {
  if (!phone || typeof phone !== 'string') {
    return `${fieldName} is required.`;
  }
  const clean = phone.trim();
  if (!clean) {
    return `${fieldName} is required.`;
  }
  if (!PHONE_REGEX.test(clean)) {
    return 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.';
  }
  return '';
};

/**
 * Format phone input on change: restrict to digits only and max 10 characters
 */
export const formatPhoneInput = (val) => {
  if (!val) return '';
  return val.replace(/\D/g, '').slice(0, 10);
};

/**
 * Format pincode input on change: restrict to digits only and max 6 characters
 */
export const formatPincodeInput = (val) => {
  if (!val) return '';
  return val.replace(/\D/g, '').slice(0, 6);
};

/**
 * Validate email address
 */
export const validateEmail = (email, fieldName = 'Email') => {
  if (!email || typeof email !== 'string') {
    return `${fieldName} is required.`;
  }
  if (/\s/.test(email)) {
    return 'Email cannot contain spaces.';
  }
  const clean = email.trim();
  if (!clean) {
    return `${fieldName} is required.`;
  }
  if (!EMAIL_REGEX.test(clean)) {
    return 'Please enter a valid email address.';
  }
  return '';
};

/**
 * Validate strong password
 */
export const validatePassword = (password, fieldName = 'Password') => {
  if (!password || typeof password !== 'string') {
    return `${fieldName} is required.`;
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!PASSWORD_REGEX.test(password)) {
    return 'Password must be at least 8 characters and contain uppercase, lowercase, number and special character.';
  }
  return '';
};

/**
 * Validate confirm password
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return '';
};

/**
 * Validate name (Full Name, Customer Name, Business Name, etc.)
 */
export const validateName = (name, fieldName = 'Name', min = 2, max = 50) => {
  if (!name || typeof name !== 'string') {
    return `${fieldName} is required.`;
  }
  const clean = name.trim();
  if (clean.length < min) {
    return `${fieldName} must be at least ${min} characters.`;
  }
  if (clean.length > max) {
    return `${fieldName} cannot exceed ${max} characters.`;
  }
  if (!NAME_REGEX.test(clean)) {
    return `${fieldName} must contain only letters, spaces, dots, hyphens, or apostrophes.`;
  }
  return '';
};

/**
 * Validate address
 */
export const validateAddress = (address, fieldName = 'Address', min = 5, max = 250) => {
  if (!address || typeof address !== 'string') {
    return `${fieldName} is required.`;
  }
  const clean = address.trim();
  if (clean.length < min) {
    return `${fieldName} must be at least ${min} characters.`;
  }
  if (clean.length > max) {
    return `${fieldName} cannot exceed ${max} characters.`;
  }
  if (/^[^a-zA-Z0-9]+$/.test(clean)) {
    return `${fieldName} cannot contain only special characters.`;
  }
  return '';
};

/**
 * Validate Indian pincode (6 digits)
 */
export const validatePincode = (pincode, fieldName = 'Pincode') => {
  if (!pincode) return ''; // optional unless required
  const clean = String(pincode).trim();
  if (!PINCODE_REGEX.test(clean)) {
    return 'Please enter a valid 6-digit pincode.';
  }
  return '';
};

/**
 * Validate numeric amount
 */
export const validateAmount = (amount, fieldName = 'Amount', min = 0) => {
  if (amount === undefined || amount === null || amount === '') {
    return `${fieldName} is required.`;
  }
  const num = Number(amount);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number.`;
  }
  if (num < min) {
    return `${fieldName} cannot be negative.`;
  }
  return '';
};

/**
 * Validate vehicle registration number
 */
export const validateVehicleNumber = (vehicleNumber, fieldName = 'Vehicle number') => {
  if (!vehicleNumber || typeof vehicleNumber !== 'string') {
    return `${fieldName} is required.`;
  }
  const clean = vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
  if (clean.length < 5 || clean.length > 20) {
    return `${fieldName} must be between 5 and 20 characters.`;
  }
  if (!/^[A-Z0-9-]+$/.test(clean)) {
    return `${fieldName} must contain only letters, numbers, and hyphens.`;
  }
  return '';
};

/**
 * Validate text length
 */
export const validateTextLength = (text, fieldName = 'Field', min = 5, max = 250, required = true) => {
  if (!text || typeof text !== 'string') {
    if (required) return `${fieldName} is required.`;
    return '';
  }
  const clean = text.trim();
  if (required && clean.length === 0) {
    return `${fieldName} is required.`;
  }
  if (clean.length > 0 && clean.length < min) {
    return `${fieldName} must be at least ${min} characters.`;
  }
  if (clean.length > max) {
    return `${fieldName} cannot exceed ${max} characters.`;
  }
  return '';
};

/**
 * Validate required field
 */
export const validateRequired = (val, fieldName = 'Field') => {
  if (val === undefined || val === null) {
    return `${fieldName} is required.`;
  }
  if (typeof val === 'string' && val.trim().length === 0) {
    return `${fieldName} is required.`;
  }
  return '';
};
