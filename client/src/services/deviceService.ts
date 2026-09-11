/**
 * Device Service
 * CRUD operations for devices table
 * Handles device linking/unlinking and status management
 */

import api from './api';
import {
  Device,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  LinkDeviceRequest,
  UnlinkDeviceRequest,
  DeviceWithEmployee,
  ApiResponse,
  PaginatedResponse,
} from '../types/interfaces';
import { API_ENDPOINTS } from '../constants/enums';

/**
 * Fetch all devices with pagination and filters
 */
export const getDevices = async (
  limit: number = 50,
  offset: number = 0,
  filters?: {
    employee_id?: string;
    link_status?: string;
    is_active?: boolean;
    search?: string; // Search in serial_number, phone_number_1, imei_1
  }
): Promise<PaginatedResponse<DeviceWithEmployee>> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (filters?.employee_id) {
    params.append('employee_id', filters.employee_id);
  }
  if (filters?.link_status) {
    params.append('link_status', filters.link_status);
  }
  if (filters?.is_active !== undefined) {
    params.append('is_active', filters.is_active.toString());
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }

  const response = await api.get<PaginatedResponse<DeviceWithEmployee>>(
    `${API_ENDPOINTS.DEVICES}?${params}`
  );
  return response.data;
};

/**
 * Fetch single device by serial_number with employee details
 */
export const getDevice = async (
  serial_number: string
): Promise<DeviceWithEmployee> => {
  const response = await api.get<ApiResponse<DeviceWithEmployee>>(
    API_ENDPOINTS.DEVICE(serial_number)
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to fetch device');
  }
  return response.data.data!;
};

/**
 * Fetch devices for a specific employee
 */
export const getEmployeeDevices = async (
  emp_id: string
): Promise<Device[]> => {
  const response = await api.get<ApiResponse<Device[]>>(
    `${API_ENDPOINTS.DEVICES}?employee_id=${emp_id}`
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to fetch employee devices'
    );
  }
  return response.data.data!;
};

/**
 * Create new device (typically from Android app registration)
 */
export const createDevice = async (
  data: CreateDeviceRequest
): Promise<Device> => {
  const response = await api.post<ApiResponse<Device>>(
    API_ENDPOINTS.DEVICES,
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to create device');
  }
  return response.data.data!;
};

/**
 * Update device details
 */
export const updateDevice = async (
  serial_number: string,
  data: UpdateDeviceRequest
): Promise<Device> => {
  const response = await api.patch<ApiResponse<Device>>(
    API_ENDPOINTS.DEVICE(serial_number),
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to update device');
  }
  return response.data.data!;
};

/**
 * Link device to employee (MANUAL_LINKED)
 * Called from admin dashboard when assigning device to employee
 */
export const linkDevice = async (
  serial_number: string,
  emp_id: string,
  linked_by?: string
): Promise<Device> => {
  const payload: LinkDeviceRequest = {
    serial_number,
    employee_id: emp_id,
    link_status: 'MANUAL_LINKED',
  };

  const response = await api.post<ApiResponse<Device>>(
    API_ENDPOINTS.DEVICE_LINK(serial_number),
    payload
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to link device');
  }
  return response.data.data!;
};

/**
 * Unlink device from employee
 * Sets employee_id to NULL and link_status to UNLINKED
 */
export const unlinkDevice = async (
  serial_number: string
): Promise<Device> => {
  const payload: UnlinkDeviceRequest = {
    serial_number,
  };

  const response = await api.post<ApiResponse<Device>>(
    API_ENDPOINTS.DEVICE_UNLINK(serial_number),
    payload
  );
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to unlink device');
  }
  return response.data.data!;
};

/**
 * Deactivate device
 * Sets is_active to false but keeps employee_id and link_status unchanged
 */
export const deactivateDevice = async (
  serial_number: string
): Promise<Device> => {
  const response = await api.patch<ApiResponse<Device>>(
    API_ENDPOINTS.DEVICE(serial_number),
    { is_active: false }
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to deactivate device'
    );
  }
  return response.data.data!;
};

/**
 * Activate device
 */
export const activateDevice = async (
  serial_number: string
): Promise<Device> => {
  const response = await api.patch<ApiResponse<Device>>(
    API_ENDPOINTS.DEVICE(serial_number),
    { is_active: true }
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to activate device'
    );
  }
  return response.data.data!;
};

/**
 * Fetch call logs for a specific device
 */
export const getDeviceCallLogs = async (serial_number: string) => {
  const response = await api.get<ApiResponse<any>>(
    API_ENDPOINTS.DEVICE_CALLS(serial_number)
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to fetch device call logs'
    );
  }
  return response.data.data!;
};

/**
 * Fetch unlinked devices (employee_id IS NULL)
 * Useful for admin dashboard showing devices available for assignment
 */
export const getUnlinkedDevices = async (
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<Device>> => {
  const response = await api.get<PaginatedResponse<Device>>(
    `${API_ENDPOINTS.DEVICES}?link_status=UNLINKED&limit=${limit}&offset=${offset}`
  );
  return response.data;
};

/**
 * Batch update device link status (admin operation)
 */
export const bulkLinkDevices = async (
  links: Array<{ serial_number: string; emp_id: string }>
): Promise<Device[]> => {
  const response = await api.post<ApiResponse<Device[]>>(
    `${API_ENDPOINTS.DEVICES}/bulk-link`,
    { links }
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to bulk link devices'
    );
  }
  return response.data.data!;
};

export default {
  getDevices,
  getDevice,
  getEmployeeDevices,
  createDevice,
  updateDevice,
  linkDevice,
  unlinkDevice,
  deactivateDevice,
  activateDevice,
  getDeviceCallLogs,
  getUnlinkedDevices,
  bulkLinkDevices,
};
