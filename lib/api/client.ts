import type { ApiError } from '@/types/api';

/**
 * Base API client with error handling
 */

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Generic fetch wrapper with error handling
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      const error = data as ApiError;
      throw new ApiClientError(
        error.error || 'Request failed',
        response.status,
        error.details
      );
    }

    return data as T;
  } catch (error) {
    // Re-throw ApiClientError as-is
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiClientError(
        'Network error. Please check your connection.',
        0
      );
    }

    // Handle other errors
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0
    );
  }
}
