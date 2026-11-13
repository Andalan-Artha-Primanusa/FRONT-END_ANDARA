/**
 * Work Schedule Core Data Structure
 */
export interface WorkScheduleItem {
  id: string | number;
  name: string;
  check_in_time: string;
  check_out_time: string;
  grace_period: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Payload for creating a new work schedule
 */
export interface WorkScheduleCreatePayload {
  name: string;
  check_in_time: string;
  check_out_time: string;
  grace_period: number;
}

/**
 * Payload for updating an existing work schedule
 */
export interface WorkScheduleUpdatePayload {
  name?: string;
  check_in_time?: string;
  check_out_time?: string;
  grace_period?: number;
}

/**
 * API Response for List
 */
export interface WorkScheduleListResponse {
  success: boolean;
  data: WorkScheduleItem[] | { items: WorkScheduleItem[] };
  message?: string;
}

/**
 * API Response for Single Item
 */
export interface WorkScheduleDetailResponse {
  success: boolean;
  data: WorkScheduleItem;
  message?: string;
}
