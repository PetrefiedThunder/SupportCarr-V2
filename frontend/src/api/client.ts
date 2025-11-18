import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, ApiError } from '@/types';

/**
 * API Client Configuration
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Custom API Error Class
 */
export class APIError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(error: ApiError['error']) {
    super(error.message);
    this.name = 'APIError';
    this.statusCode = error.statusCode;
    this.code = error.code;
    this.context = error.context;
  }
}

/**
 * Token Storage
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  },

  setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  },

  setRefreshToken(token: string): void {
    localStorage.setItem('refreshToken', token);
  },

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  },
};

/**
 * Create Axios Instance
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request Interceptor: Add auth token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenStorage.getAccessToken();

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add correlation ID for request tracing
      if (config.headers) {
        config.headers['X-Correlation-ID'] = generateCorrelationId();
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // Response Interceptor: Handle errors and token refresh
  instance.interceptors.response.use(
    (response) => {
      // Return only the data for successful responses
      return response.data;
    },
    async (error: AxiosError<ApiError>) => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized - try to refresh token
      if (error.response?.status === 401 && originalRequest && !originalRequest.headers?.['X-Retry']) {
        try {
          const refreshToken = tokenStorage.getRefreshToken();

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Attempt to refresh the token
          const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            { refreshToken },
          );

          // Update tokens
          tokenStorage.setAccessToken(data.data.accessToken);
          tokenStorage.setRefreshToken(data.data.refreshToken);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
            originalRequest.headers['X-Retry'] = 'true';
          }

          return instance(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          tokenStorage.clearTokens();
          window.location.href = '/signin';
          return Promise.reject(refreshError);
        }
      }

      // Handle API errors
      if (error.response?.data?.error) {
        throw new APIError(error.response.data.error);
      }

      // Handle network errors
      if (!error.response) {
        throw new Error('Network error. Please check your connection.');
      }

      // Generic error
      throw new Error(error.message || 'An unexpected error occurred');
    },
  );

  return instance;
};

/**
 * Generate correlation ID for request tracing
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * API Client Instance
 */
export const apiClient = createAxiosInstance();

/**
 * Helper function for GET requests
 */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<unknown, ApiResponse<T>>(url, { params });
  return response.data;
}

/**
 * Helper function for POST requests
 */
export async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.post<unknown, ApiResponse<T>>(url, data);
  return response.data;
}

/**
 * Helper function for PUT requests
 */
export async function put<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.put<unknown, ApiResponse<T>>(url, data);
  return response.data;
}

/**
 * Helper function for PATCH requests
 */
export async function patch<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.patch<unknown, ApiResponse<T>>(url, data);
  return response.data;
}

/**
 * Helper function for DELETE requests
 */
export async function del<T>(url: string): Promise<T> {
  const response = await apiClient.delete<unknown, ApiResponse<T>>(url);
  return response.data;
}

/**
 * Upload file with progress tracking
 */
export async function uploadFile<T>(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<unknown, ApiResponse<T>>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });

  return response.data;
}
