import { api } from "@/shared/api/httpClient";

export type AttendanceItem = Record<string, unknown>;

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const extractPayload = (raw: unknown) => {
  const root = toRecord(raw);
  return root.data ?? raw;
};

const extractArrayPayload = (raw: unknown): AttendanceItem[] => {
  const payload = extractPayload(raw);

  if (Array.isArray(payload)) {
    return payload.filter((item): item is AttendanceItem => !!item && typeof item === "object");
  }

  const payloadRecord = toRecord(payload);
  const candidates = [payloadRecord.items, payloadRecord.rows, payloadRecord.data, payloadRecord.results];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is AttendanceItem => !!item && typeof item === "object");
    }
  }

  return [];
};

export const getAllAttendanceRecords = async (params?: Record<string, any>) => {
  const response = await api.get("/attendance/all", { params });
  return {
    items: extractArrayPayload(response.data),
    raw: response.data,
  };
};

export const getAttendanceDetail = async (id: string) => {
  const response = await api.get(`/attendance/${id}`);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const deleteAttendanceRecord = async (id: string) => {
  const response = await api.delete(`/attendance/${id}`);
  return { raw: response.data };
};
