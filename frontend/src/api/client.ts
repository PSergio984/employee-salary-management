import { ApiErrorResponse } from '../types/auth.js';

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, errorData: ApiErrorResponse['error']) {
    super(errorData.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = errorData.code;
    this.fieldErrors = errorData.fieldErrors;
  }
}

type UnauthorizedListener = () => void;
let onUnauthorizedListener: UnauthorizedListener | null = null;

export function setUnauthorizedListener(listener: UnauthorizedListener | null): void {
  onUnauthorizedListener = listener;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  // Requirement: X-Salary-Client: web on every state-changing request
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!headers.has('X-Salary-Client')) {
      headers.set('X-Salary-Client', 'web');
    }
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Failed to communicate with server. Please check your connection.',
    });
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // Auto-invalidate session on protected 401s (not login)
  if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
    if (onUnauthorizedListener) {
      onUnauthorizedListener();
    }
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorBody = data?.error || {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'An error occurred',
    };
    throw new ApiError(response.status, errorBody);
  }

  return data as T;
}
