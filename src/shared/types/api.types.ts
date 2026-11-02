/**
 * FitMate AI — Standard API Envelope & Pagination Types
 * Aligned with Phase 3.3 API Contracts Specification
 */

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    pagination: PaginationMeta;
  };
}

export interface ApiValidationErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  correlationId?: string;
  details?: ApiValidationErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

// Global declaration to augment Express Request with correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

