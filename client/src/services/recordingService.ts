/**
 * Recording Service
 * Operations for call_recordings table and S3 playback URLs
 * Migrated from MongoDB 'recordings' table
 * EXISTS ONLY FOR CLIENT + TEAM_MEMBER CALLS (1:1 with call_logs)
 * Pre-signed S3 URLs are generated ON DEMAND and never cached
 */

import api from './api';
import {
  CallRecording,
  CreateRecordingRequest,
  UpdateRecordingStatusRequest,
  RecordingMetadata,
  RecordingPlaybackUrl,
  ApiResponse,
  PaginatedResponse,
} from '../types/interfaces';
import { API_ENDPOINTS } from '../constants/enums';

/**
 * Fetch all recording metadata with pagination
 */
export const getRecordings = async (
  limit: number = 50,
  offset: number = 0,
  filters?: {
    device_serial?: string;
    upload_status?: string;
    search?: string; // Search in s3_key
  }
): Promise<PaginatedResponse<RecordingMetadata>> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (filters?.device_serial) {
    params.append('device_serial', filters.device_serial);
  }
  if (filters?.upload_status) {
    params.append('upload_status', filters.upload_status);
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }

  const response = await api.get<PaginatedResponse<RecordingMetadata>>(
    `${API_ENDPOINTS.RECORDINGS}?${params}`
  );
  return response.data;
};

/**
 * Fetch single recording metadata by ID
 */
export const getRecording = async (id: string): Promise<RecordingMetadata> => {
  const response = await api.get<ApiResponse<RecordingMetadata>>(
    API_ENDPOINTS.RECORDING(id)
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to fetch recording'
    );
  }
  return response.data.data!;
};

/**
 * Fetch recording by call_log_id (1:1 relationship)
 * Most common way to fetch recording for a specific call
 */
export const getRecordingByCallLogId = async (
  call_log_id: string
): Promise<RecordingMetadata | null> => {
  try {
    const response = await api.get<ApiResponse<RecordingMetadata>>(
      API_ENDPOINTS.RECORDING_BY_CALL(call_log_id)
    );
    if (!response.data.success) {
      return null; // No recording for this call
    }
    return response.data.data!;
  } catch (error) {
    // 404 or recording doesn't exist
    return null;
  }
};

/**
 * Get pre-signed S3 URL for playback (ON DEMAND - never cache)
 * Called when user clicks play button
 * URL expires after ~15 minutes
 */
export const getRecordingPlaybackUrl = async (
  recording_id: string
): Promise<RecordingPlaybackUrl> => {
  const response = await api.get<ApiResponse<RecordingPlaybackUrl>>(
    API_ENDPOINTS.RECORDING_PLAYBACK_URL(recording_id)
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to get playback URL'
    );
  }
  return response.data.data!;
};

/**
 * Get pre-signed S3 URL by call_log_id
 * Convenience method for playback
 */
export const getRecordingPlaybackUrlByCallLogId = async (
  call_log_id: string
): Promise<RecordingPlaybackUrl> => {
  const recording = await getRecordingByCallLogId(call_log_id);
  if (!recording) {
    throw new Error(`No recording found for call_log_id: ${call_log_id}`);
  }
  return getRecordingPlaybackUrl(recording.id);
};

/**
 * Create recording entry (called from Android after call ends)
 * Local file path is populated initially, cleared after S3 upload
 */
export const createRecording = async (
  data: CreateRecordingRequest
): Promise<CallRecording> => {
  const response = await api.post<ApiResponse<CallRecording>>(
    API_ENDPOINTS.RECORDINGS,
    data
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to create recording'
    );
  }
  return response.data.data!;
};

/**
 * Update recording status (e.g., mark as UPLOADING, COMPLETED, FAILED)
 * Called by Android app as upload progresses
 */
export const updateRecordingStatus = async (
  id: string,
  data: UpdateRecordingStatusRequest
): Promise<CallRecording> => {
  const response = await api.patch<ApiResponse<CallRecording>>(
    API_ENDPOINTS.RECORDING(id),
    data
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to update recording'
    );
  }
  return response.data.data!;
};

/**
 * Fetch recordings for a device
 */
export const getDeviceRecordings = async (
  device_serial: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<RecordingMetadata>> => {
  return getRecordings(limit, offset, { device_serial });
};

/**
 * Fetch failed or retry-scheduled recordings (admin dashboard)
 */
export const getFailedRecordings = async (
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<RecordingMetadata>> => {
  const params = new URLSearchParams({
    upload_status: 'FAILED,RETRY_SCHEDULED',
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await api.get<PaginatedResponse<RecordingMetadata>>(
    `${API_ENDPOINTS.RECORDINGS}?${params}`
  );
  return response.data;
};

/**
 * Fetch recordings pending upload
 */
export const getPendingRecordings = async (
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<RecordingMetadata>> => {
  return getRecordings(limit, offset, { upload_status: 'PENDING' });
};

/**
 * Fetch successfully uploaded recordings
 */
export const getUploadedRecordings = async (
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<RecordingMetadata>> => {
  return getRecordings(limit, offset, { upload_status: 'COMPLETED' });
};

/**
 * Check if recording exists for a call
 */
export const hasRecording = async (call_log_id: string): Promise<boolean> => {
  const recording = await getRecordingByCallLogId(call_log_id);
  return recording !== null;
};

/**
 * Fetch recordings for a date range (for reports)
 */
export const getRecordingsByDateRange = async (
  startDate: Date,
  endDate: Date,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<RecordingMetadata>> => {
  const params = new URLSearchParams({
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await api.get<PaginatedResponse<RecordingMetadata>>(
    `${API_ENDPOINTS.RECORDINGS}?${params}`
  );
  return response.data;
};

/**
 * Get recording upload statistics for dashboard
 */
export const getRecordingStatistics = async (filters?: {
  start_date?: string;
  end_date?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);

  const response = await api.get<ApiResponse<any>>(
    `${API_ENDPOINTS.RECORDINGS}/statistics?${params}`
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to fetch recording statistics'
    );
  }
  return response.data.data!;
};

/**
 * Retry failed recording upload
 * Admin endpoint to manually trigger retry for failed recordings
 */
export const retryFailedRecording = async (id: string): Promise<void> => {
  const response = await api.post<ApiResponse<null>>(
    `${API_ENDPOINTS.RECORDING(id)}/retry`
  );
  if (!response.data.success) {
    throw new Error(
      response.data.error?.message || 'Failed to retry recording'
    );
  }
};

/**
 * Export recording metadata to CSV
 */
export const exportRecordings = async (filters?: {
  start_date?: string;
  end_date?: string;
  upload_status?: string;
}): Promise<Blob> => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.upload_status) params.append('upload_status', filters.upload_status);

  const response = await api.get(
    `${API_ENDPOINTS.RECORDINGS}/export?${params}`,
    {
      responseType: 'blob',
    }
  );
  return response.data;
};

export default {
  getRecordings,
  getRecording,
  getRecordingByCallLogId,
  getRecordingPlaybackUrl,
  getRecordingPlaybackUrlByCallLogId,
  createRecording,
  updateRecordingStatus,
  getDeviceRecordings,
  getFailedRecordings,
  getPendingRecordings,
  getUploadedRecordings,
  hasRecording,
  getRecordingsByDateRange,
  getRecordingStatistics,
  retryFailedRecording,
  exportRecordings,
};
