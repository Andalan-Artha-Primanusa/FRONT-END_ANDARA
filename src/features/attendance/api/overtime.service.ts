import { api } from '@/shared/api/httpClient';

const overtimeService = {
  // Employee: create overtime request if it doesn't exist
  createOvertimeRequest: async (attendanceId: string | number) => {
    const response = await api.post('/my/overtime', { attendance_id: attendanceId });
    return response.data;
  },

  // Employee: upload evidence (file, max 5MB)
  uploadEvidence: async (overtimeId: string | number, file: File, additional?: Record<string, any>) => {
    const form = new FormData();
    form.append('file', file);
    if (additional) {
      Object.keys(additional).forEach((k) => {
        const v = additional[k];
        if (v !== undefined && v !== null) form.append(k, String(v));
      });
    }
    const response = await api.post(`/my/overtime/${overtimeId}/evidence`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      maxContentLength: 5 * 1024 * 1024,
    });
    return response.data;
  },

  // Employee: list my evidences for an overtime request
  getMyEvidences: async (overtimeId: string | number) => {
    const response = await api.get(`/my/overtime/${overtimeId}/evidences`);
    return response.data;
  },

  // Manager: list evidences for a given overtime request
  getEvidencesForRequest: async (requestId: string | number) => {
    const response = await api.get(`/overtime/evidences/request/${requestId}`);
    return response.data;
  },

  // Manager: approve an evidence
  approveEvidence: async (evidenceId: string | number) => {
    const response = await api.put(`/overtime/evidences/${evidenceId}/approve`);
    return response.data;
  },

  // Manager: reject an evidence (optional reason)
  rejectEvidence: async (evidenceId: string | number, reason?: string) => {
    const response = await api.put(`/overtime/evidences/${evidenceId}/reject`, { reason });
    return response.data;
  },
};

export default overtimeService;
