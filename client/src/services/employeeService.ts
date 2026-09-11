/**
 * Employee Service
 * CRUD operations for employees table
 * Migrated from MongoDB 'users' table (phone_no → emp_id)
 */

import api from './api';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  ApiResponse,
  PaginatedResponse,
} from '../types/interfaces';
import { API_ENDPOINTS } from '../constants/enums';

/**
 * Fetch all employees with pagination and filters
 */
export const getEmployees = async (
  limit: number = 50,
  offset: number = 0,
  filters?: {
    is_active?: boolean;
    designation?: string;
    search?: string; // Search in full_name, email, emp_id
  }
): Promise<PaginatedResponse<Employee>> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (filters?.is_active !== undefined) {
    params.append('is_active', filters.is_active.toString());
  }
  if (filters?.designation) {
    params.append('designation', filters.designation);
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }

  const response = await api.get<PaginatedResponse<Employee>>(
    `${API_ENDPOINTS.EMPLOYEES}?${params}`
  );
  return response.data;
};

/**
 * Fetch single employee by emp_id
 */
export const getEmployee = async (emp_id: string): Promise<Employee> => {
  const response = await api.get<ApiResponse<Employee>>(
    API_ENDPOINTS.EMPLOYEE(emp_id)
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to fetch employee');
  }
  return response.data.data!;
};

/**
 * Create new employee
 */
export const createEmployee = async (
  data: CreateEmployeeRequest
): Promise<Employee> => {
  const response = await api.post<ApiResponse<Employee>>(
    API_ENDPOINTS.EMPLOYEES,
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to create employee');
  }
  return response.data.data!;
};

/**
 * Update existing employee
 */
export const updateEmployee = async (
  emp_id: string,
  data: UpdateEmployeeRequest
): Promise<Employee> => {
  const response = await api.patch<ApiResponse<Employee>>(
    API_ENDPOINTS.EMPLOYEE(emp_id),
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to update employee');
  }
  return response.data.data!;
};

/**
 * Delete employee (soft delete - sets is_active to false)
 */
export const deleteEmployee = async (emp_id: string): Promise<void> => {
  const response = await api.delete<ApiResponse<null>>(
    API_ENDPOINTS.EMPLOYEE(emp_id)
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to delete employee');
  }
};

/**
 * Fetch call statistics for an employee
 */
export const getEmployeeCallStats = async (emp_id: string) => {
  const response = await api.get<ApiResponse<any>>(
    API_ENDPOINTS.EMPLOYEE_CALLS(emp_id)
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to fetch call stats');
  }
  return response.data.data!;
};

/**
 * Batch create employees (admin import/migration)
 */
export const bulkCreateEmployees = async (
  employees: CreateEmployeeRequest[]
): Promise<Employee[]> => {
  const response = await api.post<ApiResponse<Employee[]>>(
    `${API_ENDPOINTS.EMPLOYEES}/bulk`,
    { employees }
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to bulk create employees'
    );
  }
  return response.data.data!;
};

/**
 * Export employees to CSV
 */
export const exportEmployees = async (): Promise<Blob> => {
  const response = await api.get(`${API_ENDPOINTS.EMPLOYEES}/export`, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeCallStats,
  bulkCreateEmployees,
  exportEmployees,
};
