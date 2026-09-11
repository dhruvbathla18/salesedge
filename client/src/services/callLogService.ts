/**
 * Call Log Service
 * CRUD operations for call_logs table
 * Migrated from MongoDB 'calls', 'call_classifications', 'call_statuses' (merged into one table)
 * Includes filtering by employee, date range, category, direction
 */

import api from './api';
import {
  CallLog,
  CallLogWithDetails,
  CreateCallLogRequest,
  UpdateCallLogRequest,
  CallLogFilters,
  ApiResponse,
  PaginatedResponse,
} from '../types/interfaces';
import { API_ENDPOINTS } from '../constants/enums';

/**
 * Fetch all call logs with advanced filtering
 */
export const getCallLogs = async (
  filters: CallLogFilters & { limit?: number; offset?: number }
): Promise<PaginatedResponse<CallLogWithDetails>> => {
  const {
    employee_id,
    start_date,
    end_date,
    call_category,
    call_direction,
    limit = 50,
    offset = 0,
  } = filters;

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (employee_id) params.append('employee_id', employee_id);
  if (start_date) params.append('start_date', start_date);
  if (end_date) params.append('end_date', end_date);
  if (call_category) params.append('call_category', call_category);
  if (call_direction) params.append('call_direction', call_direction);

  const response = await api.get<PaginatedResponse<CallLogWithDetails>>(
    `${API_ENDPOINTS.CALL_LOGS}?${params}`
  );
  return response.data;
};

/**
 * Fetch single call log with all related data (form, recording)
 */
export const getCallLog = async (id: string): Promise<CallLogWithDetails> => {
  const response = await api.get<ApiResponse<CallLogWithDetails>>(
    API_ENDPOINTS.CALL_LOG(id)
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to fetch call log');
  }
  return response.data.data!;
};

/**
 * Fetch call logs for a specific employee
 */
export const getEmployeeCallLogs = async (
  emp_id: string,
  limit: number = 50,
  offset: number = 0,
  filters?: Omit<CallLogFilters, 'employee_id'>
): Promise<PaginatedResponse<CallLogWithDetails>> => {
  return getCallLogs({
    employee_id: emp_id,
    limit,
    offset,
    ...filters,
  });
};

/**
 * Fetch call logs for a specific device
 */
export const getDeviceCallLogs = async (
  device_serial: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<CallLogWithDetails>> => {
  const params = new URLSearchParams({
    device_serial,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await api.get<PaginatedResponse<CallLogWithDetails>>(
    `${API_ENDPOINTS.CALL_LOGS}?${params}`
  );
  return response.data;
};

/**
 * Create new call log
 * Called from Android app when call ends
 */
export const createCallLog = async (
  data: CreateCallLogRequest
): Promise<CallLog> => {
  const response = await api.post<ApiResponse<CallLog>>(
    API_ENDPOINTS.CALL_LOGS,
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to create call log');
  }
  return response.data.data!;
};

/**
 * Update call log (e.g., change category, mark form submitted)
 */
export const updateCallLog = async (
  id: string,
  data: UpdateCallLogRequest
): Promise<CallLog> => {
  const response = await api.patch<ApiResponse<CallLog>>(
    API_ENDPOINTS.CALL_LOG(id),
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to update call log');
  }
  return response.data.data!;
};

/**
 * Fetch call logs for today
 */
export const getTodayCallLogs = async (
  emp_id?: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<CallLogWithDetails>> => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  return getCallLogs({
    employee_id: emp_id,
    start_date: startOfDay.toISOString(),
    end_date: now.toISOString(),
    limit,
    offset,
  });
};

/**
 * Fetch call logs for a date range
 */
export const getCallLogsByDateRange = async (
  startDate: Date,
  endDate: Date,
  filters?: Omit<CallLogFilters, 'start_date' | 'end_date'>
): Promise<PaginatedResponse<CallLogWithDetails>> => {
  return getCallLogs({
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    ...filters,
  });
};

/**
 * Fetch call logs by category (CLIENT, TEAM_MEMBER, PERSONAL, MISSED)
 */
export const getCallLogsByCategory = async (
  category: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<CallLogWithDetails>> => {
  return getCallLogs({
    call_category: category,
    limit,
    offset,
  });
};

/**
 * Fetch business calls (CLIENT + TEAM_MEMBER categories)
 */
export const getBusinessCallLogs = async (
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<CallLogWithDetails>> => {
  const params = new URLSearchParams({
    is_business: 'true',
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await api.get<PaginatedResponse<CallLogWithDetails>>(
    `${API_ENDPOINTS.CALL_LOGS}?${params}`
  );
  return response.data;
};

/**
 * Fetch calls requiring form submission
 */
export const getCallsRequiringForm = async (
  emp_id?: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<CallLogWithDetails>> => {
  return getCallLogs({
    employee_id: emp_id,
    call_category: 'CLIENT',
    limit,
    offset,
  });
};

/**
 * Mark call log as form submitted
 */
export const markFormSubmitted = async (id: string): Promise<CallLog> => {
  return updateCallLog(id, { is_form_submitted: true });
};

/**
 * Batch create call logs (from Android device sync)
 */
export const bulkCreateCallLogs = async (
  callLogs: CreateCallLogRequest[]
): Promise<CallLog[]> => {
  const response = await api.post<ApiResponse<CallLog[]>>(
    `${API_ENDPOINTS.CALL_LOGS}/bulk`,
    { call_logs: callLogs }
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to bulk create call logs'
    );
  }
  return response.data.data!;
};

/**
 * Get call statistics for dashboard
 */
export const getCallStatistics = async (filters?: {
  start_date?: string;
  end_date?: string;
  emp_id?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.emp_id) params.append('emp_id', filters.emp_id);

  const response = await api.get<ApiResponse<any>>(
    `${API_ENDPOINTS.CALL_LOGS}/statistics?${params}`
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to fetch call statistics'
    );
  }
  return response.data.data!;
};

/**
 * Export call logs to CSV
 */
export const exportCallLogs = async (filters?: CallLogFilters): Promise<Blob> => {
  const params = new URLSearchParams();
  if (filters?.employee_id) params.append('employee_id', filters.employee_id);
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.call_category) params.append('call_category', filters.call_category);
  if (filters?.call_direction) params.append('call_direction', filters.call_direction);

  const response = await api.get(
    `${API_ENDPOINTS.CALL_LOGS}/export?${params}`,
    {
      responseType: 'blob',
    }
  );
  return response.data;
};

export default {
  getCallLogs,
  getCallLog,
  getEmployeeCallLogs,
  getDeviceCallLogs,
  createCallLog,
  updateCallLog,
  getTodayCallLogs,
  getCallLogsByDateRange,
  getCallLogsByCategory,
  getBusinessCallLogs,
  getCallsRequiringForm,
  markFormSubmitted,
  bulkCreateCallLogs,
  getCallStatistics,
  exportCallLogs,
};
