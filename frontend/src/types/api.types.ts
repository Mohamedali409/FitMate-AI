/**
 * FitMate AI — Frontend Standard API Envelope Types
 * Matched strictly to backend `src/shared/types/api.types.ts`
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

