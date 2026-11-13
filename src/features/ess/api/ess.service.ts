import { api } from "@/shared/api/httpClient";
import { extractArrayPayload, extractPayload, parsePaginatedResponse } from "@/shared/api/pagination";
import type { GenericApiItem, MyReimbursementPayload } from "../types/ess.types";

const isGenericApiItem = (item: unknown): item is GenericApiItem =>
  item !== null && typeof item === "object" && !Array.isArray(item);

export const getMyKpi = async (page = 1, perPage = 10) => {
  const token = sessionStorage.getItem("token");
  
  const response = await api.get("/my/kpi", {
    params: { page, per_page: perPage },
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    validateStatus: (status) => (status >= 200 && status < 300) || status === 500
  });
  
  const raw = response.data;
  const parsed = parsePaginatedResponse(raw, isGenericApiItem);
  return {
    items: parsed.items,
    totalPages: parsed.totalPages,
    raw,
  };
};

export const getMyKpiPeriods = async (page = 1, perPage = 10) => {
  const token = sessionStorage.getItem("token");

  const response = await api.get("/my/kpi-periods", {
    params: { page, per_page: perPage },
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    validateStatus: (status) => (status >= 200 && status < 300) || status === 500
  });

  const raw = response.data;
  const parsed = parsePaginatedResponse(raw, isGenericApiItem);
  return {
    items: parsed.items,
    totalPages: parsed.totalPages,
    raw,
  };
};

export const submitMyKpiPeriod = async (id: string, itemId?: number) => {
  const token = sessionStorage.getItem("token");
  const response = await api.post(`/my/kpi-periods/${id}/submit`, itemId ? { item_id: itemId } : {}, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });
  return {
    raw: response.data,
  };
};

export const updateMyKpiPeriodItems = async (
  id: string,
  items: Array<{ id: number; achievement: number }>
) => {
  const token = sessionStorage.getItem("token");

  const response = await api.put(`/my/kpi-periods/${id}/items`, { items }, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });

  return {
    raw: response.data,
  };
};

export const getMyReimbursements = async (status?: string, page = 1, perPage = 10) => {
  const response = await api.get("/my/reimbursements", {
    params: { ...(status ? { status } : {}), page, per_page: perPage },
  });

  const raw = response.data;
  const parsed = parsePaginatedResponse(raw, isGenericApiItem);
  return {
    items: parsed.items,
    totalPages: parsed.totalPages,
    raw,
  };
};

export const createMyReimbursement = async (payload: MyReimbursementPayload) => {
  // Backend: POST /my/reimbursements → createMyReimbursement() controller
  const response = await api.post("/my/reimbursements", payload);
  return {
    raw: response.data,
  };
};

export const submitMyReimbursement = async (id: string) => {
  // Backend: POST /my/reimbursements/{id}/submit → submit() controller
  const response = await api.post(`/my/reimbursements/${id}/submit`);
  return {
    raw: response.data,
  };
};

export const getMyPayroll = async (page = 1, perPage = 10) => {
  const response = await api.get("/my/payroll", { params: { page, per_page: perPage } });
  const raw = response.data;
  // API returns { success, message, data: [...] }
  const parsed = parsePaginatedResponse(raw, isGenericApiItem);
  return {
    items: parsed.items,
    totalPages: parsed.totalPages,
    raw,
  };
};

export const getMyPayrollDetail = async (id: string) => {
  const response = await api.get(`/my/payroll/${id}`);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const getMyPayrollSlip = async (id: string) => {
  // API returns { success, message, data: { id, period, status, employee, summary, earnings, deductions } }
  const response = await api.get(`/my/payroll/${id}/slip`);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const exportMyPayrollCsv = async (id: string) => {
  const response = await api.get(`/my/payroll/${id}/export`, {
    responseType: 'blob'
  });
  return response.data;
};

export const exportMyPayrollPdf = async (id: string) => {
  const response = await api.get(`/my/payroll/${id}/export-pdf`, {
    responseType: 'blob'
  });
  return response.data;
};

export const getMyLeaves = async () => {
  const response = await api.get("/leaves/my");
  return {
    items: extractArrayPayload(response.data, isGenericApiItem),
    raw: response.data,
  };
};

export const getMyLeaveBalance = async () => {
  const response = await api.get("/leaves/balance");
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const checkInAttendance = async (latitude: number, longitude: number) => {
  const response = await api.post("/attendance/check-in", { latitude, longitude });
  return { raw: response.data };
};

export const checkOutAttendance = async () => {
  const response = await api.post("/attendance/check-out");
  return { raw: response.data };
};

export const getAttendanceHistory = async () => {
  const response = await api.get("/attendance/history");
  return { items: extractArrayPayload(response.data, isGenericApiItem), raw: response.data };
};

export const getTodayAttendance = async () => {
  const response = await api.get("/attendance/today");
  return { payload: extractPayload(response.data), raw: response.data };
};
