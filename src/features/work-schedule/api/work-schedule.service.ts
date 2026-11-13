import { api } from "@/shared/api/httpClient";
import type { 
  WorkScheduleItem, 
  WorkScheduleCreatePayload, 
  WorkScheduleUpdatePayload,
  WorkScheduleListResponse,
  WorkScheduleDetailResponse
} from "../types/work-schedule.types";

/**
 * Handle API responses and extract items correctly
 */
function extractListFromResponse(response: any): WorkScheduleItem[] {
  const data = response?.data;
  if (!data) return [];
  
  // Handle Laravel Paginator (data.data)
  if (data.data && Array.isArray(data.data)) return data.data;
  
  if (Array.isArray(data)) return data;
  if (data.items && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Get all work schedules with pagination support
 */
export async function getAllWorkSchedules(page: number = 1, perPage: number = 10): Promise<{ items: WorkScheduleItem[], total: number }> {
  try {
    const response = await api.get<WorkScheduleListResponse>("/work-schedules", {
      params: { page, per_page: perPage }
    });
    
    const rootData = response.data?.data as any;
    const items = extractListFromResponse(response.data);
    const total = rootData?.total ?? items.length;
    
    return { items, total };
  } catch (error: any) {
    console.error("Failed to fetch work schedules:", error);
    throw new Error(error.response?.data?.message || "Gagal memuat jadwal kerja");
  }
}

/**
 * Get single work schedule detail
 */
export async function getWorkScheduleDetail(id: string | number): Promise<WorkScheduleItem> {
  try {
    const response = await api.get<WorkScheduleDetailResponse>(`/work-schedules/${id}`);
    if (!response.data?.data) {
      throw new Error("Data jadwal kerja tidak ditemukan");
    }
    return response.data.data;
  } catch (error: any) {
    console.error(`Failed to fetch work schedule ${id}:`, error);
    throw new Error(error.response?.data?.message || `Gagal memuat detail jadwal kerja ${id}`);
  }
}

/**
 * Create new work schedule
 */
export async function createWorkSchedule(payload: WorkScheduleCreatePayload): Promise<WorkScheduleItem> {
  try {
    const response = await api.post<WorkScheduleDetailResponse>("/work-schedules", payload);
    if (!response.data?.data) {
      throw new Error("Gagal membuat jadwal kerja baru");
    }
    return response.data.data;
  } catch (error: any) {
    console.error("Failed to create work schedule:", error);
    throw new Error(error.response?.data?.message || "Gagal membuat jadwal kerja");
  }
}

/**
 * Update existing work schedule
 */
export async function updateWorkSchedule(id: string | number, payload: WorkScheduleUpdatePayload): Promise<WorkScheduleItem> {
  try {
    const response = await api.put<WorkScheduleDetailResponse>(`/work-schedules/${id}`, payload);
    if (!response.data?.data) {
      throw new Error("Gagal memperbarui jadwal kerja");
    }
    return response.data.data;
  } catch (error: any) {
    console.error(`Failed to update work schedule ${id}:`, error);
    throw new Error(error.response?.data?.message || "Gagal memperbarui jadwal kerja");
  }
}

/**
 * Delete work schedule
 */
export async function deleteWorkSchedule(id: string | number): Promise<void> {
  try {
    await api.delete(`/work-schedules/${id}`);
  } catch (error: any) {
    console.error(`Failed to delete work schedule ${id}:`, error);
    throw new Error(error.response?.data?.message || "Gagal menghapus jadwal kerja");
  }
}
