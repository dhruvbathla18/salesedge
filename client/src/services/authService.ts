/**
 * Authentication Service
 * JWT-based auth with httpOnly refresh tokens
 * Access token: 15 minutes
 * Refresh token: 7 days (httpOnly cookie)
 */

import api, {
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  decodeToken,
} from './api';
import {
  LoginRequest,
  LoginResponse,
  JwtPayload,
  ApiResponse,
} from '../types/interfaces';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants/enums';

/**
 * Login with email and password
 * Backend issues access token and httpOnly refresh cookie
 */
export const login = async (
  credentials: LoginRequest
): Promise<LoginResponse> => {
  try {
    const response = await api.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.LOGIN,
      credentials,
      {
        withCredentials: true, // Send cookies
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Login failed');
    }

    const { access_token, user } = response.data.data!;

    // Store access token
    setAuthToken(access_token);

    // Store user info
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(
      STORAGE_KEYS.LAST_AUTH_TIME,
      new Date().toISOString()
    );

    return { access_token, user };
  } catch (error: any) {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'Login failed';
    throw new Error(message);
  }
};

/**
 * Logout
 * Clears tokens and calls backend to invalidate refresh token
 */
export const logout = async (): Promise<void> => {
  try {
    // Call backend logout endpoint
    await api.post(
      API_ENDPOINTS.LOGOUT,
      {},
      {
        withCredentials: true,
      }
    );
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear tokens locally regardless of backend response
    clearAuthToken();
  }
};

/**
 * Refresh access token
 * Called automatically by axios interceptor on 401
 * Backend uses httpOnly refresh cookie to issue new access token
 */
export const refreshAccessToken = async (): Promise<string> => {
  try {
    const response = await api.post<ApiResponse<{ access_token: string }>>(
      API_ENDPOINTS.REFRESH,
      {},
      {
        withCredentials: true, // Send refresh token cookie
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'Token refresh failed'
      );
    }

    const { access_token } = response.data.data!;
    setAuthToken(access_token);

    return access_token;
  } catch (error: any) {
    clearAuthToken();
    throw error;
  }
};

/**
 * Get current user from localStorage
 * Returns null if not logged in
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to parse user:', error);
    return null;
  }
};

/**
 * Get JWT payload (decoded)
 * WARNING: Never trust claims on client - only for UX
 */
export const getJwtPayload = (): JwtPayload | null => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    return decodeToken(token) as JwtPayload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return !!token;
};

/**
 * Check if user has required role
 */
export const hasRole = (
  requiredRole: 'ADMIN' = 'ADMIN'
): boolean => {
  const payload = getJwtPayload();
  if (!payload) return false;
  return payload.role === 'ADMIN';
};

/**
 * Check if user is admin
 */
export const isAdmin = (): boolean => {
  return hasRole('ADMIN');
};

/**
 * Check if user is super admin (aliased to isAdmin in single admin setup)
 */
export const isSuperAdmin = (): boolean => {
  return hasRole('ADMIN');
};

/**
 * Get current user's admin name from JWT
 */
export const getCurrentAdminUser = (): string | null => {
  const payload = getJwtPayload();
  return payload?.admin_user || null;
};

/**
 * Change password
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const response = await api.post<ApiResponse<null>>(
    '/auth/change-password',
    {
      current_password: currentPassword,
      new_password: newPassword,
    }
  );

  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to change password'
    );
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  const response = await api.post<ApiResponse<null>>(
    '/auth/forgot-password',
    { email }
  );

  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to request password reset'
    );
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<void> => {
  const response = await api.post<ApiResponse<null>>(
    '/auth/reset-password',
    {
      token,
      new_password: newPassword,
    }
  );

  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to reset password'
    );
  }
};

export default {
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,
  getJwtPayload,
  isAuthenticated,
  hasRole,
  isAdmin,
  isSuperAdmin,
  getCurrentAdminUser,
  changePassword,
  requestPasswordReset,
  resetPassword,
};
