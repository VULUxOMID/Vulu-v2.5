import { OnboardingData } from '../context/OnboardingContext';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

// Username validation
export const validateUsername = (username: string): ValidationResult => {
  if (!username.trim()) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 20) {
    return { isValid: false, error: 'Username must be less than 20 characters' };
  }
  
  // Check for valid characters (alphanumeric, underscore, hyphen)
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  // Check for reserved usernames
  const reservedUsernames = ['admin', 'root', 'user', 'guest', 'test', 'support', 'help'];
  if (reservedUsernames.includes(username.toLowerCase())) {
    return { isValid: false, error: 'This username is not available' };
  }
  
  return { isValid: true };
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' };
  }
  
  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: 'Password must contain at least one letter and one number' };
  }
  
  return { isValid: true };
};

// Phone number validation (optional)
export const validatePhoneNumber = (phoneNumber: string): ValidationResult => {
  if (!phoneNumber.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' };
  }

  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number must be less than 15 digits' };
  }

  return { isValid: true };
};

// Step-specific validation for new 5-step flow
export const validateStep = (step: number, data: OnboardingData): ValidationResult => {
  switch (step) {
    case 1: // ContactMethod
      // At least one contact method required
      if (!data.email.trim() && !data.phoneNumber.trim()) {
        return { isValid: false, error: 'Please provide at least one contact method' };
      }
      // Validate email if provided
      if (data.email.trim()) {
        const emailValidation = validateEmail(data.email);
        if (!emailValidation.isValid) {
          return emailValidation;
        }
      }
      // Validate phone if provided
      if (data.phoneNumber.trim()) {
        const phoneValidation = validatePhoneNumber(data.phoneNumber);
        if (!phoneValidation.isValid) {
          return phoneValidation;
        }
      }
      return { isValid: true };

    case 2: // Username
      return validateUsername(data.username);

    case 3: // Password
      return validatePassword(data.password);

    case 4: // Profile (optional)
      return { isValid: true };

    case 5: // Finish
      return { isValid: true };

    default:
      return { isValid: false, error: 'Invalid step' };
  }
};

// Complete onboarding validation for new 5-step flow
export const validateCompleteOnboarding = (data: OnboardingData): ValidationResult => {
  // Check all required fields
  const requiredValidations = [
    validateUsername(data.username),
    validatePassword(data.password),
  ];

  // At least one contact method required
  if (!data.email.trim() && !data.phoneNumber.trim()) {
    return { isValid: false, error: 'Please provide at least one contact method' };
  }

  // Validate email if provided
  if (data.email.trim()) {
    requiredValidations.push(validateEmail(data.email));
  }

  // Validate phone if provided
  if (data.phoneNumber.trim()) {
    requiredValidations.push(validatePhoneNumber(data.phoneNumber));
  }

  for (const validation of requiredValidations) {
    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true };
};

// Username availability check (mock implementation)
export const checkUsernameAvailability = async (username: string): Promise<ValidationResult> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock unavailable usernames
  const unavailableUsernames = ['john', 'jane', 'admin', 'test', 'user123'];
  
  if (unavailableUsernames.includes(username.toLowerCase())) {
    return { isValid: false, error: 'This username is already taken' };
  }
  
  return { isValid: true };
};

// Email availability check (mock implementation)
export const checkEmailAvailability = async (email: string): Promise<ValidationResult> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Mock unavailable emails
  const unavailableEmails = ['test@example.com', 'admin@test.com'];
  
  if (unavailableEmails.includes(email.toLowerCase())) {
    return { isValid: false, error: 'An account with this email already exists' };
  }
  
  return { isValid: true };
};
