import { api } from '@/shared/api/httpClient';
import { extractArrayPayload, extractPayload, parsePaginatedResponse } from '@/shared/api/pagination';

type AttendanceRecord = Record<string, unknown>;

const isAttendanceRecord = (item: unknown): item is AttendanceRecord =>
  item !== null && typeof item === 'object' && !Array.isArray(item);

export const attendanceService = {
  /**
   * Employee: Check in
   * POST /attendance/check-in
   */
  checkIn: async (latitude: number, longitude: number) => {
    const response = await api.post('attendance/check-in', { latitude, longitude });
    return { raw: response.data };
  },

  /**
   * Employee: Check out
   * POST /attendance/check-out
   */
  checkOut: async () => {
    const response = await api.post('attendance/check-out');
    return { raw: response.data };
  },

  /**
   * Employee: Get attendance history
   * GET /attendance/history
   */
  getHistory: async (page = 1, perPage = 10) => {
    const response = await api.get('attendance/history', { params: { page, per_page: perPage } });
    const raw = response.data;
    const parsed = parsePaginatedResponse(raw, isAttendanceRecord);
    return {
      items: parsed.items,
      currentPage: parsed.currentPage,
      totalPages: parsed.totalPages,
      total: parsed.total,
      raw,
    };
  },

  /**
   * Employee: Get today's attendance
   * GET /attendance/today
   */
  getToday: async () => {
    const response = await api.get('attendance/today');
    return {
      payload: extractPayload(response.data),
      raw: response.data,
    };
  },

  /**
   * Employee: Get overtime summary derived from attendance history
   * GET /attendance/overtime
   */
  getOvertimeSummary: async (days: number = 30) => {
    const response = await api.get('attendance/overtime', {
      params: { days },
    });

    return {
      payload: extractPayload(response.data),
      raw: response.data,
    };
  },

  /**
   * Employee: Get available locations
   * GET /attendance/locations
   */
  getLocations: async () => {
    const response = await api.get('attendance/locations');
    return {
      items: extractArrayPayload(response.data, isAttendanceRecord),
      raw: response.data,
    };
  },

  /**
   * Admin: Get all attendance records
   * GET /attendance/all
   */
  getAll: async (params?: Record<string, unknown>) => {
    const response = await api.get('attendance/all', { params });
    const parsed = parsePaginatedResponse(response.data, isAttendanceRecord);
    return {
      items: parsed.items,
      totalPages: parsed.totalPages,
      raw: response.data,
    };
  },

  /**
   * Admin: Get attendance by ID
   * GET /attendance/{id}
   */
  getById: async (id: string | number) => {
    const response = await api.get(`attendance/${id}`);
    return {
      payload: extractPayload(response.data),
      raw: response.data,
    };
  },

  /**
   * Admin: Delete attendance record
   * DELETE /attendance/{id}
   */
  delete: async (id: string | number) => {
    const response = await api.delete(`attendance/${id}`);
    return { raw: response.data };
  },
};

export default attendanceService;
