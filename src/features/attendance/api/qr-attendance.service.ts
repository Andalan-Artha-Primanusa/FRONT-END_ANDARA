import { api } from "@/shared/api/httpClient";

export type QrPurpose = "attendance" | "check_in" | "check_out";

const unwrap = <T>(response: { data: { data?: T } | T }) => {
  const payload = response.data as { data?: T };
  return payload.data ?? (response.data as T);
};

export const qrAttendanceService = {
  async generate(data: { company_id?: number; location_id?: number; work_schedule_id?: number; purpose?: QrPurpose; ttl_seconds?: number }) {
    const response = await api.post("/attendance/qr/generate", data);
    return unwrap<{ token: string; qr_payload: unknown; expires_at: string }>(response);
  },

  async checkIn(data: { token: string; latitude: number; longitude: number }) {
    const response = await api.post("/attendance/qr/check-in", data);
    return unwrap(response);
  },

  async checkOut(data: { token: string }) {
    const response = await api.post("/attendance/qr/check-out", data);
    return unwrap(response);
  },
};
