/**
 * Call Form Data Service
 * CRUD operations for call_form_data table
 * Migrated from MongoDB 'companies', 'contacts' tables
 * EXISTS ONLY FOR CLIENT CALLS (1:1 with call_logs)
 */

import api from './api';
import {
  CallFormData,
  CreateCallFormRequest,
  UpdateCallFormRequest,
  ApiResponse,
  PaginatedResponse,
} from '../types/interfaces';
import { API_ENDPOINTS } from '../constants/enums';

/**
 * Fetch all call form data with pagination
 */
export const getCallForms = async (
  limit: number = 50,
  offset: number = 0,
  filters?: {
    company_name?: string;
    search?: string; // Search in company_name, customer_name
  }
): Promise<PaginatedResponse<CallFormData>> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (filters?.company_name) {
    params.append('company_name', filters.company_name);
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }

  const response = await api.get<PaginatedResponse<CallFormData>>(
    `${API_ENDPOINTS.CALL_FORMS}?${params}`
  );
  return response.data;
};

/**
 * Fetch single call form by ID
 */
export const getCallForm = async (id: string): Promise<CallFormData> => {
  const response = await api.get<ApiResponse<CallFormData>>(
    API_ENDPOINTS.CALL_FORM(id)
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to fetch call form');
  }
  return response.data.data!;
};

/**
 * Fetch call form by call_log_id (1:1 relationship)
 * Most common way to fetch form since it's associated with a specific call
 */
export const getCallFormByCallLogId = async (
  call_log_id: string
): Promise<CallFormData | null> => {
  try {
    const response = await api.get<ApiResponse<CallFormData>>(
      API_ENDPOINTS.CALL_FORM_BY_LOG(call_log_id)
    );
    if (!response.data.success) {
      return null; // No form exists for this call_log
    }
    return response.data.data!;
  } catch (error) {
    // 404 or form doesn't exist
    return null;
  }
};

/**
 * Create call form for a CLIENT call
 * This is called after the call ends and popup shows form
 */
export const createCallForm = async (
  data: CreateCallFormRequest
): Promise<CallFormData> => {
  const response = await api.post<ApiResponse<CallFormData>>(
    API_ENDPOINTS.CALL_FORMS,
    data
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to create call form'
    );
  }
  return response.data.data!;
};

/**
 * Update existing call form
 */
export const updateCallForm = async (
  id: string,
  data: UpdateCallFormRequest
): Promise<CallFormData> => {
  const response = await api.patch<ApiResponse<CallFormData>>(
    API_ENDPOINTS.CALL_FORM(id),
    data
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to update call form'
    );
  }
  return response.data.data!;
};

/**
 * Update call form by call_log_id
 * Convenience method for updating the associated form
 */
export const updateCallFormByCallLogId = async (
  call_log_id: string,
  data: UpdateCallFormRequest
): Promise<CallFormData> => {
  const form = await getCallFormByCallLogId(call_log_id);
  if (!form) {
    throw new Error(`No call form found for call_log_id: ${call_log_id}`);
  }
  return updateCallForm(form.id, data);
};

/**
 * Check if a call_log has a form submitted
 */
export const hasCallFormData = async (
  call_log_id: string
): Promise<boolean> => {
  const form = await getCallFormByCallLogId(call_log_id);
  return form !== null;
};

/**
 * Fetch call forms for a date range (for reports)
 */
export const getCallFormsByDateRange = async (
  startDate: Date,
  endDate: Date,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<CallFormData>> => {
  const params = new URLSearchParams({
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await api.get<PaginatedResponse<CallFormData>>(
    `${API_ENDPOINTS.CALL_FORMS}?${params}`
  );
  return response.data;
};

/**
 * Fetch forms by company
 */
export const getFormsByCompany = async (
  company_name: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<CallFormData>> => {
  return getCallForms(limit, offset, { company_name });
};

/**
 * Get list of unique companies from call forms (for dropdown/filter)
 */
export const getUniqueCompanies = async (): Promise<string[]> => {
  const response = await api.get<ApiResponse<string[]>>(
    `${API_ENDPOINTS.CALL_FORMS}/companies`
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to fetch companies'
    );
  }
  return response.data.data!;
};

/**
 * Export call forms to CSV
 */
export const exportCallForms = async (filters?: {
  start_date?: string;
  end_date?: string;
  company_name?: string;
}): Promise<Blob> => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.company_name) params.append('company_name', filters.company_name);

  const response = await api.get(
    `${API_ENDPOINTS.CALL_FORMS}/export?${params}`,
    {
      responseType: 'blob',
    }
  );
  return response.data;
};

export default {
  getCallForms,
  getCallForm,
  getCallFormByCallLogId,
  createCallForm,
  updateCallForm,
  updateCallFormByCallLogId,
  hasCallFormData,
  getCallFormsByDateRange,
  getFormsByCompany,
  getUniqueCompanies,
  exportCallForms,
};
