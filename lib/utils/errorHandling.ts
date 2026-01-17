/**
 * Error handling utilities
 */

/**
 * Extract error message from unknown error type
 * @param error - The error object (unknown type)
 * @param fallback - Fallback message if error message cannot be extracted
 * @returns The error message string
 */
export const getErrorMessage = (
  error: unknown,
  fallback: string = 'An error occurred'
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
};
