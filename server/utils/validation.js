/**
 * FleetHub 2.0 - Backend Validation Utility
 * Comprehensive input validation and sanitization helpers
 */

// Regex patterns
const PHONE_REGEX = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,49}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const VEHICLE_NUMBER_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$|^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{0,3}[ -]?[0-9]{4}$/i;

/**
 * Validate phone number (Indian standard: exactly 10 digits starting with 6, 7, 8, 9)
 */
const validatePhone = (phone, fieldName = 'Phone number') => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const cleanPhone = phone.trim();
  if (cleanPhone.length === 0) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  if (!PHONE_REGEX.test(cleanPhone)) {
    return {
      isValid: false,
      error: 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.',
    };
  }
  return { isValid: true, value: cleanPhone };
};

/**
 * Validate email address
 */
const validateEmail = (email, fieldName = 'Email') => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  if (/\s/.test(email)) {
    return { isValid: false, error: 'Email cannot contain spaces.' };
  }
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail.length === 0) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  if (cleanEmail.length > 100) {
    return { isValid: false, error: `${fieldName} cannot exceed 100 characters.` };
  }
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }
  return { isValid: true, value: cleanEmail };
};

/**
 * Validate strong password
 */
const validatePassword = (password, fieldName = 'Password') => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'Password cannot exceed 128 characters.' };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return {
      isValid: false,
      error:
        'Password must be at least 8 characters and contain uppercase, lowercase, number and special character.',
    };
  }
  return { isValid: true, value: password };
};

/**
 * Validate name (Full Name, Customer Name, Business Name, etc.)
 */
const validateName = (name, fieldName = 'Name', min = 2, max = 50) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const cleanName = name.trim();
  if (cleanName.length < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min} characters.` };
  }
  if (cleanName.length > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max} characters.` };
  }
  if (!NAME_REGEX.test(cleanName)) {
    return {
      isValid: false,
      error: `${fieldName} must contain only letters, spaces, dots, hyphens, or apostrophes.`,
    };
  }
  return { isValid: true, value: cleanName };
};

/**
 * Validate address
 */
const validateAddress = (address, fieldName = 'Address', min = 5, max = 250) => {
  if (!address || typeof address !== 'string') {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const cleanAddress = address.trim().replace(/\s+/g, ' ');
  if (cleanAddress.length < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min} characters.` };
  }
  if (cleanAddress.length > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max} characters.` };
  }
  // Check if string contains only special characters
  if (/^[^a-zA-Z0-9]+$/.test(cleanAddress)) {
    return { isValid: false, error: `${fieldName} cannot contain only special characters.` };
  }
  return { isValid: true, value: cleanAddress };
};

/**
 * Validate Indian pincode (6 digits)
 */
const validatePincode = (pincode, fieldName = 'Pincode') => {
  if (!pincode) return { isValid: true, value: '' }; // Optional unless marked required
  const cleanPin = String(pincode).trim();
  if (!PINCODE_REGEX.test(cleanPin)) {
    return { isValid: false, error: 'Please enter a valid 6-digit pincode.' };
  }
  return { isValid: true, value: cleanPin };
};

/**
 * Validate numeric amount (e.g. order amount, maintenance cost)
 */
const validateAmount = (amount, fieldName = 'Amount', min = 0, max = 1000000) => {
  if (amount === undefined || amount === null || amount === '') {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const num = Number(amount);
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number.` };
  }
  if (num < min) {
    return { isValid: false, error: `${fieldName} cannot be negative.` };
  }
  if (num > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ₹${max.toLocaleString('en-IN')}.` };
  }
  return { isValid: true, value: num };
};

/**
 * Validate numeric value with options
 */
const validateNumber = (value, fieldName = 'Value', { min = 0, max = 1000000, allowDecimal = true, required = true } = {}) => {
  if (value === undefined || value === null || value === '') {
    if (required) return { isValid: false, error: `${fieldName} is required.` };
    return { isValid: true, value: null };
  }
  const num = Number(value);
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number.` };
  }
  if (!allowDecimal && !Number.isInteger(num)) {
    return { isValid: false, error: `${fieldName} must be a whole number.` };
  }
  if (num < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}.` };
  }
  if (num > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max}.` };
  }
  return { isValid: true, value: num };
};

/**
 * Validate vehicle registration number
 */
const validateVehicleNumber = (vehicleNumber, fieldName = 'Vehicle number') => {
  if (!vehicleNumber || typeof vehicleNumber !== 'string') {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const clean = vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
  if (clean.length < 5 || clean.length > 20) {
    return { isValid: false, error: `${fieldName} must be between 5 and 20 characters.` };
  }
  if (!/^[A-Z0-9-]+$/.test(clean)) {
    return { isValid: false, error: `${fieldName} must contain only letters, numbers, and hyphens.` };
  }
  return { isValid: true, value: clean };
};

/**
 * Validate text length
 */
const validateTextLength = (text, fieldName = 'Field', min = 5, max = 250, required = true) => {
  if (!text || typeof text !== 'string') {
    if (required) return { isValid: false, error: `${fieldName} is required.` };
    return { isValid: true, value: '' };
  }
  const clean = text.trim();
  if (required && clean.length === 0) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  if (clean.length > 0 && clean.length < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min} characters.` };
  }
  if (clean.length > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max} characters.` };
  }
  return { isValid: true, value: clean };
};

/**
 * Validate enum value
 */
const validateEnum = (value, allowedValues, fieldName = 'Field') => {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  if (!allowedValues.includes(value)) {
    return {
      isValid: false,
      error: `Invalid ${fieldName}. Allowed values: ${allowedValues.join(', ')}`,
    };
  }
  return { isValid: true, value };
};

/**
 * Validate future date (e.g. license expiry)
 */
const validateFutureDate = (dateVal, fieldName = 'Date') => {
  if (!dateVal) return { isValid: true, value: null };
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    return { isValid: false, error: `Invalid ${fieldName} format.` };
  }
  if (d <= new Date()) {
    return { isValid: false, error: `${fieldName} must be a future date.` };
  }
  return { isValid: true, value: d };
};

/**
 * Sanitize regex search string to prevent regex injection (ReDoS)
 */
const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  const trimmed = query.trim().slice(0, 100);
  return trimmed.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

/**
 * Helper to respond with 400 validation error
 */
const sendValidationError = (res, errors, message = 'Validation failed') => {
  return res.status(400).json({
    success: false,
    message,
    errors,
  });
};

module.exports = {
  PHONE_REGEX,
  EMAIL_REGEX,
  NAME_REGEX,
  PINCODE_REGEX,
  PASSWORD_REGEX,
  VEHICLE_NUMBER_REGEX,
  validatePhone,
  validateEmail,
  validatePassword,
  validateName,
  validateAddress,
  validatePincode,
  validateAmount,
  validateNumber,
  validateVehicleNumber,
  validateTextLength,
  validateEnum,
  validateFutureDate,
  sanitizeSearchQuery,
  sendValidationError,
};
