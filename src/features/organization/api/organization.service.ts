import { api } from "@/shared/api/httpClient";

export const organizationService = {
  // Org Structure
  getOrgChart: async () => {
    const response = await api.get('/organization/chart');
    return response.data;
  },
  getDirectory: async () => {
    const response = await api.get('/organization/directory');
    return response.data;
  },
  getTeamMembers: async (managerId: string | number) => {
    const response = await api.get(`/organization/team/${managerId}`);
    return response.data;
  },

  // Compliance
  getComplianceOverview: async () => {
    const response = await api.get('/compliance/overview');
    return response.data;
  },
  getExpiringDocuments: async () => {
    const response = await api.get('/compliance/expiring-documents');
    return response.data;
  },

  // Approval Flows
  getApprovalFlows: async () => {
    const response = await api.get('/approval-flows');
    return response.data;
  },
  createApprovalFlow: async (data: any) => {
    const response = await api.post('/approval-flows', data);
    return response.data;
  },
  updateApprovalFlow: async (id: number | string, data: any) => {
    const response = await api.put(`/approval-flows/${id}`, data);
    return response.data;
  },
  deleteApprovalFlow: async (id: number | string) => {
    const response = await api.delete(`/approval-flows/${id}`);
    return response.data;
  },

  // Approval History
  getApprovalHistory: async (module: string, moduleId: number | string) => {
    const response = await api.get(`/approval-history/${module}/${moduleId}`);
    return response.data;
  },
};
