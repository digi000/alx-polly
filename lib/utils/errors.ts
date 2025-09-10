import type { PollActionResult } from "../types/poll";

// Standard error types
export enum PollErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  PERMISSION_ERROR = "PERMISSION_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface PollError {
  type: PollErrorType;
  message: string;
  details?: string;
  field?: string;
}

/**
 * Create a standardized success response
 * @param message - Success message
 * @param pollId - Optional poll ID
 * @returns Standardized success result
 */
export function createSuccessResult(
  message: string,
  pollId?: string
): PollActionResult {
  return {
    success: true,
    message,
    pollId,
  };
}

/**
 * Create a standardized error response
 * @param type - Type of error
 * @param message - Error message
 * @param errors - Optional field-specific errors
 * @returns Standardized error result
 */
export function createErrorResult(
  type: PollErrorType,
  message: string,
  errors?: Record<string, string[]>
): PollActionResult {
  console.error(`[${type}] ${message}`, errors);
  
  return {
    success: false,
    message,
    errors,
  };
}

/**
 * Create a validation error response
 * @param errors - Field-specific validation errors
 * @returns Standardized validation error result
 */
export function createValidationError(
  errors: Record<string, string[]>
): PollActionResult {
  return createErrorResult(
    PollErrorType.VALIDATION_ERROR,
    "Validation failed. Please check your input and try again.",
    errors
  );
}

/**
 * Create an authentication error response
 * @param message - Optional custom message
 * @returns Standardized authentication error result
 */
export function createAuthError(
  message: string = "Authentication required. Please log in."
): PollActionResult {
  return createErrorResult(PollErrorType.AUTHENTICATION_ERROR, message);
}

/**
 * Create a permission error response
 * @param message - Optional custom message
 * @returns Standardized permission error result
 */
export function createPermissionError(
  message: string = "You don't have permission to perform this action."
): PollActionResult {
  return createErrorResult(PollErrorType.PERMISSION_ERROR, message);
}

/**
 * Create a database error response
 * @param operation - The operation that failed
 * @param details - Optional error details
 * @returns Standardized database error result
 */
export function createDatabaseError(
  operation: string,
  details?: string
): PollActionResult {
  return createErrorResult(
    PollErrorType.DATABASE_ERROR,
    `Database error: Failed to ${operation}.`,
    undefined
  );
}

/**
 * Create a not found error response
 * @param resource - The resource that was not found
 * @returns Standardized not found error result
 */
export function createNotFoundError(
  resource: string = "resource"
): PollActionResult {
  return createErrorResult(
    PollErrorType.NOT_FOUND_ERROR,
    `${resource.charAt(0).toUpperCase() + resource.slice(1)} not found.`
  );
}

/**
 * Handle and standardize unknown errors
 * @param error - The unknown error
 * @param operation - The operation that failed
 * @returns Standardized error result
 */
export function handleUnknownError(
  error: unknown,
  operation: string = "complete operation"
): PollActionResult {
  const message = error instanceof Error ? error.message : "An unexpected error occurred";
  
  console.error(`Unknown error during ${operation}:`, error);
  
  return createErrorResult(
    PollErrorType.UNKNOWN_ERROR,
    `Failed to ${operation}. ${message}`
  );
}

/**
 * Wrap an async operation with standardized error handling
 * @param operation - The async operation to wrap
 * @param operationName - Name of the operation for error messages
 * @returns Promise with standardized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T | PollActionResult> {
  try {
    return await operation();
  } catch (error) {
    return handleUnknownError(error, operationName);
  }
}
