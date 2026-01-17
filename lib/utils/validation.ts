/**
 * Validation utilities for API requests and user input
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate and sanitize a string input
 * @param value - The value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Trimmed string or default value
 */
export const parseString = (value: unknown, defaultValue: string = ''): string => {
  return typeof value === 'string' ? value.trim() : defaultValue;
};

/**
 * Validate prompt text
 * @param prompt - The prompt to validate
 * @param maxLength - Maximum allowed length (default: 4000)
 * @returns Validation result with error message if invalid
 */
export const validatePrompt = (
  prompt: string,
  maxLength: number = 4000
): ValidationResult => {
  const trimmed = prompt.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: 'Please provide a prompt.',
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: 'That prompt is a bit too long. Please shorten it.',
    };
  }

  return { valid: true };
};

/**
 * Validate required string field
 * @param value - The value to validate
 * @param fieldName - Name of the field for error message
 * @returns Validation result
 */
export const validateRequired = (
  value: string,
  fieldName: string = 'field'
): ValidationResult => {
  if (!value.trim()) {
    return {
      valid: false,
      error: `Missing ${fieldName}.`,
    };
  }

  return { valid: true };
};
