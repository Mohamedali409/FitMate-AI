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

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
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

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
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

