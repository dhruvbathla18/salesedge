/**
 * Audit Log Service
 * READ-ONLY operations for audit_logs table
 * IMMUTABLE - no create/update/delete from frontend, only fetching for review
 */

import api from './api';
import {
  AuditLog,
  AuditLogFilters,
  ApiResponse,
  PaginatedResponse,
} from '../types/interfaces';
import { API_ENDPOINTS } from '../constants/enums';

/**
 * Fetch all audit logs with advanced filtering
 * No create/update/delete - audit logs are immutable
 */
export const getAuditLogs = async (
  filters: AuditLogFilters & { limit?: number; offset?: number }
): Promise<PaginatedResponse<AuditLog>> => {
  const {
    admin_user,
    action,
    entity_type,
    entity_id,
    start_date,
    end_date,
    limit = 50,
    offset = 0,
  } = filters;

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (admin_user) params.append('admin_user', admin_user);
  if (action) params.append('action', action);
  if (entity_type) params.append('entity_type', entity_type);
  if (entity_id) params.append('entity_id', entity_id);
  if (start_date) params.append('start_date', start_date);
  if (end_date) params.append('end_date', end_date);

  const response = await api.get<PaginatedResponse<AuditLog>>(
    `${API_ENDPOINTS.AUDIT_LOGS}?${params}`
  );
  return response.data;
};

/**
 * Fetch single audit log entry
 */
export const getAuditLog = async (id: string): Promise<AuditLog> => {
  const response = await api.get<ApiResponse<AuditLog>>(
    `${API_ENDPOINTS.AUDIT_LOGS}/${id}`
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to fetch audit log'
    );
  }
  return response.data.data!;
};

/**
 * Fetch audit logs for a specific admin user
 */
export const getAuditLogsByAdmin = async (
  admin_user: string,
  limit: number = 50,
  offset: number = 0,
  filters?: Omit<AuditLogFilters, 'admin_user'>
): Promise<PaginatedResponse<AuditLog>> => {
  return getAuditLogs({
    admin_user,
    limit,
    offset,
    ...filters,
  });
};

/**
 * Fetch audit logs by action type (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT)
 */
export const getAuditLogsByAction = async (
  action: string,
  limit: number = 50,
  offset: number = 0,
  filters?: Omit<AuditLogFilters, 'action'>
): Promise<PaginatedResponse<AuditLog>> => {
  return getAuditLogs({
    action,
    limit,
    offset,
    ...filters,
  });
};

/**
 * Fetch audit logs by entity type (EMPLOYEE, DEVICE)
 */
export const getAuditLogsByEntityType = async (
  entity_type: string,
  limit: number = 50,
  offset: number = 0,
  filters?: Omit<AuditLogFilters, 'entity_type'>
): Promise<PaginatedResponse<AuditLog>> => {
  return getAuditLogs({
    entity_type,
    limit,
    offset,
    ...filters,
  });
};

/**
 * Fetch audit logs for a specific entity (e.g., changes to one employee)
 */
export const getAuditLogsByEntity = async (
  entity_type: string,
  entity_id: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<AuditLog>> => {
  return getAuditLogs({
    entity_type,
    entity_id,
    limit,
    offset,
  });
};

/**
 * Fetch audit logs for a date range
 */
export const getAuditLogsByDateRange = async (
  startDate: Date,
  endDate: Date,
  filters?: Omit<AuditLogFilters, 'start_date' | 'end_date'>
): Promise<PaginatedResponse<AuditLog>> => {
  return getAuditLogs({
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    ...filters,
  });
};

/**
 * Fetch employee creation/update/delete history
 */
export const getEmployeeAuditHistory = async (
  emp_id: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<AuditLog>> => {
  return getAuditLogsByEntity('EMPLOYEE', emp_id, limit, offset);
};

/**
 * Fetch device linking/unlinking history
 */
export const getDeviceAuditHistory = async (
  serial_number: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<AuditLog>> => {
  return getAuditLogsByEntity('DEVICE', serial_number, limit, offset);
};

/**
 * Fetch all login/logout events
 */
export const getAuthAuditLogs = async (
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<AuditLog>> => {
  const params = new URLSearchParams({
    action: 'LOGIN,LOGOUT',
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await api.get<PaginatedResponse<AuditLog>>(
    `${API_ENDPOINTS.AUDIT_LOGS}?${params}`
  );
  return response.data;
};

/**
 * Fetch all export events (data exports by admins)
 */
export const getExportAuditLogs = async (
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<AuditLog>> => {
  return getAuditLogsByAction('EXPORT', limit, offset);
};

/**
 * Fetch sensitive actions (UPDATE, DELETE on sensitive entities)
 */
export const getSensitiveAuditLogs = async (
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<AuditLog>> => {
  const params = new URLSearchParams({
    action: 'UPDATE,DELETE',
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await api.get<PaginatedResponse<AuditLog>>(
    `${API_ENDPOINTS.AUDIT_LOGS}?${params}`
  );
  return response.data;
};

/**
 * Get audit summary for dashboard
 */
export const getAuditSummary = async (filters?: {
  start_date?: string;
  end_date?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);

  const response = await api.get<ApiResponse<any>>(
    `${API_ENDPOINTS.AUDIT_LOGS}/summary?${params}`
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to fetch audit summary'
    );
  }
  return response.data.data!;
};

/**
 * Export audit logs to CSV
 * Admin compliance function
 */
export const exportAuditLogs = async (filters?: AuditLogFilters): Promise<Blob> => {
  const params = new URLSearchParams();
  if (filters?.admin_user) params.append('admin_user', filters.admin_user);
  if (filters?.action) params.append('action', filters.action);
  if (filters?.entity_type) params.append('entity_type', filters.entity_type);
  if (filters?.entity_id) params.append('entity_id', filters.entity_id);
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);

  const response = await api.get(
    `${API_ENDPOINTS.AUDIT_LOGS}/export?${params}`,
    {
      responseType: 'blob',
    }
  );
  return response.data;
};

/**
 * Helper: Get human-readable change description
 * Compares old_values vs new_values
 */
export const getChangeDescription = (auditLog: AuditLog): string => {
  const { action, old_values, new_values } = auditLog;

  if (action === 'CREATE') {
    return `Created new record`;
  }

  if (action === 'DELETE') {
    return `Deleted record`;
  }

  if (action === 'UPDATE' && old_values && new_values) {
    const changes: string[] = [];
    const oldKeys = Object.keys(old_values);

    oldKeys.forEach((key) => {
      if (old_values[key] !== new_values[key]) {
        changes.push(`${key}: ${old_values[key]} → ${new_values[key]}`);
      }
    });

    return changes.length > 0 ? changes.join(', ') : 'Updated record';
  }

  return action.toLowerCase();
};

export default {
  getAuditLogs,
  getAuditLog,
  getAuditLogsByAdmin,
  getAuditLogsByAction,
  getAuditLogsByEntityType,
  getAuditLogsByEntity,
  getAuditLogsByDateRange,
  getEmployeeAuditHistory,
  getDeviceAuditHistory,
  getAuthAuditLogs,
  getExportAuditLogs,
  getSensitiveAuditLogs,
  getAuditSummary,
  exportAuditLogs,
  getChangeDescription,
};
