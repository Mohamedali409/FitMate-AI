import { config } from '../config/env';
import { ApiResponse, PaginatedResponse, ApiErrorResponse, ApiErrorBody } from '../../types/api.types';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly correlationId?: string;
  public readonly details?: Array<{ field: string; message: string }>;

  constructor(statusCode: number, errorBody: ApiErrorBody) {
    super(errorBody.message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = errorBody.code;
    this.correlationId = errorBody.correlationId;
    this.details = errorBody.details;
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
  params?: Record<string, string | number | boolean | undefined>;
  _isRetry?: boolean;
}

export type TokenRefreshHandler = () => Promise<string | null>;
export type AccessTokenProvider = () => string | null;

let tokenRefreshHandler: TokenRefreshHandler | null = null;
let accessTokenProvider: AccessTokenProvider | null = null;
let activeRefreshPromise: Promise<string | null> | null = null;

export function setTokenRefreshHandler(handler: TokenRefreshHandler | null): void {
  tokenRefreshHandler = handler;
}

export function setAccessTokenProvider(provider: AccessTokenProvider | null): void {
  accessTokenProvider = provider;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = config.apiUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }

    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { token, params, headers, ...restOptions } = options;
    const url = this.buildUrl(path, params);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    const authToken = token || accessTokenProvider?.() || undefined;
    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
      });
    } catch (networkError: any) {
      throw new ApiClientError(0, {
        code: 'NETWORK_ERROR',
        message: `Network request failed: ${networkError.message || 'Is the backend server running?'}`,
      });
    }

    // Try to parse JSON response
    let json: any;
    try {
      json = await response.json();
    } catch {
      if (!response.ok) {
        throw new ApiClientError(response.status, {
          code: 'SERVER_ERROR',
          message: `Server returned HTTP ${response.status} with non-JSON response`,
        });
      }
      return {} as T;
    }

    // Handle standard FitMate AI ApiErrorResponse envelope
    if (!response.ok || json.success === false) {
      const errResponse = json as ApiErrorResponse;

      // Handle 401 recovery (SEC-FE-006): coordinate refresh and replay once
      const isAuthEndpoint =
        path.includes('/auth/refresh') ||
        path.includes('/auth/login') ||
        path.includes('/auth/register');

      if (response.status === 401 && !options._isRetry && !isAuthEndpoint && tokenRefreshHandler) {
        try {
          if (!activeRefreshPromise) {
            activeRefreshPromise = tokenRefreshHandler().finally(() => {
              activeRefreshPromise = null;
            });
          }
          const newToken = await activeRefreshPromise;
          if (newToken) {
            return this.request<T>(path, {
              ...options,
              token: newToken,
              _isRetry: true,
            });
          }
        } catch {
          // If refresh fails, fall through to throw ApiClientError
        }
      }

      throw new ApiClientError(
        response.status,
        errResponse.error || {
          code: 'UNKNOWN_ERROR',
          message: 'An unknown server error occurred',
        }
      );
    }

    // Return the unpacked data payload
    return (json as ApiResponse<T>).data;
  }

  async requestPaginated<T>(path: string, options: RequestOptions = {}): Promise<PaginatedResponse<T>> {
    const { token, params, headers, ...restOptions } = options;
    const url = this.buildUrl(path, params);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    const authToken = token || accessTokenProvider?.() || undefined;
    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
      });
    } catch (networkError: any) {
      throw new ApiClientError(0, {
        code: 'NETWORK_ERROR',
        message: `Network request failed: ${networkError.message || 'Is the backend server running?'}`,
      });
    }

    const json = await response.json();

    if (!response.ok || json.success === false) {
      const errResponse = json as ApiErrorResponse;

      // Handle 401 recovery (SEC-FE-006): coordinate refresh and replay once
      const isAuthEndpoint =
        path.includes('/auth/refresh') ||
        path.includes('/auth/login') ||
        path.includes('/auth/register');

      if (response.status === 401 && !options._isRetry && !isAuthEndpoint && tokenRefreshHandler) {
        try {
          if (!activeRefreshPromise) {
            activeRefreshPromise = tokenRefreshHandler().finally(() => {
              activeRefreshPromise = null;
            });
          }
          const newToken = await activeRefreshPromise;
          if (newToken) {
            return this.requestPaginated<T>(path, {
              ...options,
              token: newToken,
              _isRetry: true,
            });
          }
        } catch {
          // Fall through
        }
      }

      throw new ApiClientError(
        response.status,
        errResponse.error || {
          code: 'UNKNOWN_ERROR',
          message: 'An unknown server error occurred',
        }
      );
    }

    return json as PaginatedResponse<T>;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

