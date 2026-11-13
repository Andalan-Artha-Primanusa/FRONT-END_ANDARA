import { api } from "@/shared/api/httpClient";

// ─── Helper: safely extract array from API response ───
// Handles Laravel response patterns:
//   - Direct array: [...]
//   - Wrapped: { data: [...] }
//   - Paginated: { data: { data: [...], current_page: 1, last_page: 5 } }
//   - Success wrapper: { success: true, data: [...] }
const toSafeArray = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    // Level 1: check raw.data, raw.items, raw.rows
    for (const key of ['data', 'items', 'rows', 'results']) {
      const level1 = raw[key];
      if (Array.isArray(level1)) return level1;
      // Level 2: handle paginated { data: { data: [...] } }
      if (level1 && typeof level1 === 'object' && !Array.isArray(level1)) {
        for (const key2 of ['data', 'items', 'rows']) {
          if (Array.isArray(level1[key2])) return level1[key2];
        }
      }
    }
  }
  return [];
};

// ═══════════════════════════════════════════════════════════
//  Payroll Service Object — single source of truth
// ═══════════════════════════════════════════════════════════
export const payrollService = {

  // ── Admin: List & CRUD ──────────────────────────────────
  // GET api/payroll
  getPayrollList: async (params?: any) => {
    const response = await api.get('payroll', { params });
    return response.data;
  },

  // POST api/payroll  (create payroll for 1 employee, auto-calculate)
  createPayroll: async (payload: any) => {
    const response = await api.post('payroll', payload);
    return response.data;
  },

  // POST api/payroll/generate/monthly (generate payroll for period)
  generatePayroll: async (payload: { period: string; employee_ids?: number[] }) => {
    const response = await api.post('payroll/generate/monthly', payload);
    return response.data;
  },

  // Backward compatibility
  generateMonthlyPayroll: async (period: string) => {
    const response = await api.post('payroll/generate/monthly', { period });
    return response.data;
  },

  // GET api/payroll/{id}
  getPayrollDetail: async (id: string | number) => {
    const response = await api.get(`payroll/${id}`);
    return response.data;
  },

  // GET api/payroll/{id}/slip (Admin view slip)
  getPayrollSlip: async (id: string | number) => {
    const response = await api.get(`payroll/${id}/slip`);
    return response.data;
  },

  // PUT api/payroll/{id}  (update allowance/bonus, only when draft)
  updatePayroll: async (id: string | number, payload: any) => {
    const response = await api.put(`payroll/${id}`, payload);
    return response.data;
  },

  // DELETE api/payroll/{id}
  deletePayroll: async (id: string | number) => {
    const response = await api.delete(`payroll/${id}`);
    return response.data;
  },

  // ── Admin: Workflow (draft → pending_hr → approved → paid) ──
  // POST api/payroll/{id}/approve (backward-compat: auto-routes to correct step)
  approvePayroll: async (id: string | number) => {
    const response = await api.post(`payroll/${id}/approve`);
    return response.data;
  },

  // Backward compat alias
  approvePayrollSingle: async (id: string | number) => {
    const response = await api.post(`payroll/${id}/approve`);
    return response.data;
  },

  // POST api/payroll/{id}/manager-approve  (Step 1: draft → pending_hr)
  managerApprovePayroll: async (id: string | number) => {
    const response = await api.post(`payroll/${id}/manager-approve`);
    return response.data;
  },

  // POST api/payroll/{id}/hr-approve  (Step 2: pending_hr → approved)
  hrApprovePayroll: async (id: string | number) => {
    const response = await api.post(`payroll/${id}/hr-approve`);
    return response.data;
  },

  // POST api/payroll/{id}/reject  (draft|pending_hr → rejected)
  rejectPayroll: async (id: string | number, reason: string) => {
    const response = await api.post(`payroll/${id}/reject`, { reason });
    return response.data;
  },

  // POST api/payroll/{id}/pay  (approved → paid, single)
  processPayment: async (id: string | number) => {
    const response = await api.post(`payroll/${id}/pay`);
    return response.data;
  },

  // POST api/payroll/bulk-pay  (bulk: all approved in period → paid)
  bulkMarkAsPaid: async (period: string) => {
    const response = await api.post('payroll/bulk-pay', { period });
    return response.data;
  },


  // ── Admin: Export ───────────────────────────────────────
  // GET api/payroll/{id}/export  (CSV)
  exportCsv: async (id: string | number) => {
    const response = await api.get(`payroll/${id}/export`, { responseType: 'blob' });
    return response.data;
  },

  // GET api/payroll/{id}/export-pdf  (PDF)
  exportPdf: async (id: string | number) => {
    const response = await api.get(`payroll/${id}/export-pdf`, { responseType: 'blob' });
    return response.data;
  },

  // ── Payroll Details (komponen tunjangan/potongan) ───────
  // GET api/payroll-details/{payroll_id}
  getPayrollDetails: async (payrollId: string | number) => {
    const response = await api.get(`payroll-details/${payrollId}`);
    return response.data;
  },

  // POST api/payroll-details
  addPayrollDetail: async (payload: any) => {
    const response = await api.post('payroll-details', payload);
    return response.data;
  },

  // PUT api/payroll-details/{id}
  updatePayrollDetail: async (id: string | number, payload: any) => {
    const response = await api.put(`payroll-details/${id}`, payload);
    return response.data;
  },

  // DELETE api/payroll-details/{id}
  deletePayrollDetail: async (id: string | number) => {
    const response = await api.delete(`payroll-details/${id}`);
    return response.data;
  },

  // ── ESS Endpoints (My Payroll) ──────────────────────────
  // GET api/my/payroll
  getMyPayroll: async (params?: any) => {
    const response = await api.get('my/payroll', { params });
    return response.data;
  },

  // GET api/my/payroll/{id}/slip  (get salary slip for employee - matches API)
  getMySlip: async (id: string | number) => {
    const response = await api.get(`my/payroll/${id}/slip`);
    return response.data;
  },

  // GET api/my/payroll/{id}/export  (CSV)
  exportMyPayrollCsv: async (id: string | number) => {
    const response = await api.get(`my/payroll/${id}/export`, { responseType: 'blob' });
    return response.data;
  },

  // GET api/my/payroll/{id}/export-pdf  (PDF)
  exportMyPayrollPdf: async (id: string | number) => {
    const response = await api.get(`my/payroll/${id}/export-pdf`, { responseType: 'blob' });
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════════
//  Named export wrappers — backward compat for pages that
//  import { getAllPayroll, generateMonthlyPayroll, ... }
// ═══════════════════════════════════════════════════════════
export const getAllPayroll = async (params?: any) => payrollService.getPayrollList(params);
export const getPayrollDetail = async (id: string | number) => payrollService.getPayrollDetail(id);
export const createPayroll = async (payload: any) => payrollService.createPayroll(payload);
export const updatePayroll = async (id: string | number, payload: any) => payrollService.updatePayroll(id, payload);
export const deletePayroll = async (id: string | number) => payrollService.deletePayroll(id);

// Updated: approvePayroll now expects array of IDs (matches API docs)
export const approvePayroll = async (ids: (string | number)[] | string | number) => {
  const payrollIds = Array.isArray(ids) ? ids : [ids];
  return Promise.all(payrollIds.map(id => payrollService.approvePayroll(id)));
};

export const markPayrollAsPaid = async (id: string | number) => payrollService.processPayment(id);

// Updated: generateMonthlyPayroll now uses /api/payroll/generate
export const generateMonthlyPayroll = async (payload: { period: string; employee_ids?: number[] }) => {
    return payrollService.generatePayroll({ period: payload.period, employee_ids: payload.employee_ids });
};

// Payroll detail sub-items (backward compat)
export const getPayrollDetails = async (payrollId: string | number) => payrollService.getPayrollDetails(payrollId);
export const addPayrollDetailsBulk = async (_payrollId: string | number, payload: any) => payrollService.addPayrollDetail(payload);
export const updatePayrollDetails = async (_payrollId: string | number, detailId: string | number, payload: any) => payrollService.updatePayrollDetail(detailId, payload);

// Re-export the helper for pages that need it
export { toSafeArray };
