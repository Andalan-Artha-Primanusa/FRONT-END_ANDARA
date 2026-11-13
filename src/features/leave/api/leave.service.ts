import { api } from "@/shared/api/httpClient";
import { extractArrayPayload, extractPayload, parsePaginatedResponse } from "@/shared/api/pagination";
import type {
  LeaveCreatePayload,
  LeaveDecisionPayload,
  LeaveItem,
  LeaveUpdatePayload,
  LeaveBalanceResponse,
} from "../types/leave.types";

const isLeaveItem = (item: unknown): item is LeaveItem =>
  item !== null && typeof item === "object";

export const getAllLeaves = async (page = 1, perPage = 10) => {
  const response = await api.get("leaves", { params: { page, per_page: perPage } });
  const raw = response.data;
  const parsed = parsePaginatedResponse(raw, isLeaveItem);
  return {
    items: parsed.items,
    totalPages: parsed.totalPages,
    total: parsed.total,
    raw,
  };
};

export const createLeaveRequest = async (payload: LeaveCreatePayload) => {
  const response = await api.post("leaves", payload);
  return { raw: response.data };
};

export const getLeaveCalendar = async () => {
  const response = await api.get("leaves/calendar");
  return {
    items: extractArrayPayload(response.data, isLeaveItem),
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const getLeaveDetail = async (id: string) => {
  const response = await api.get(`leaves/${id}`);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const updateLeaveRequest = async (id: string, payload: LeaveUpdatePayload) => {
  const response = await api.put(`leaves/${id}`, payload);
  return { raw: response.data };
};

export const deleteLeaveRequest = async (id: string) => {
  const response = await api.delete(`leaves/${id}`);
  return { raw: response.data };
};

export const getPendingLeaves = async (page = 1, perPage = 10) => {
  const response = await api.get("leaves/pending", { params: { page, per_page: perPage } });
  const raw = response.data;
  const parsed = parsePaginatedResponse(raw, isLeaveItem);
  return {
    items: parsed.items,
    totalPages: parsed.totalPages,
    total: parsed.total,
    raw,
  };
};

export const getLeaveRequests = async (params?: { status?: string; page?: number; per_page?: number }) => {
  const response = await api.get("leaves", { params });
  const raw = response.data;
  const parsed = parsePaginatedResponse(raw, isLeaveItem);
  return {
    items: parsed.items,
    totalPages: parsed.totalPages,
    total: parsed.total,
    raw,
  };
};

export const approveLeave = async (id: string, payload: LeaveDecisionPayload) => {
  const response = await api.put(`leaves/${id}/approve`, payload);
  return { raw: response.data };
};

export const rejectLeave = async (id: string, payload: LeaveDecisionPayload) => {
  const response = await api.put(`leaves/${id}/reject`, payload);
  return { raw: response.data };
};

export const returnLeave = async (id: string, payload: LeaveDecisionPayload) => {
  const response = await api.put(`leaves/${id}/return`, payload);
  return { raw: response.data };
};

export const resubmitLeave = async (id: string, payload?: LeaveDecisionPayload) => {
  const response = await api.put(`leaves/${id}/resubmit`, payload ?? {});
  return { raw: response.data };
};

export const getLeaveBalance = async () => {
  const response = await api.get("leaves/balance");
  return {
    policy: response.data.data.policy as LeaveBalanceResponse["policy"],
    balance: response.data.data.balance as LeaveBalanceResponse["balance"],
    raw: response.data,
  };
};
