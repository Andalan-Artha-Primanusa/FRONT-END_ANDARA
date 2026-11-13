import { api } from "@/shared/api/httpClient";
import type { 
  TrainingProgram
} from "../types/training.types";

export const trainingService = {
  // ==============================
  // Admin/HR Training Programs
  // ==============================
  getPrograms: async (params?: { status?: string; mode?: string; search?: string; page?: number; per_page?: number }) => {
    const response = await api.get('/training/programs', { params });
    return response.data;
  },
  getProgram: async (id: string | number) => {
    const response = await api.get(`/training/programs/${id}`);
    return response.data;
  },
  createProgram: async (data: Partial<TrainingProgram>) => {
    const response = await api.post('/training/programs', data);
    return response.data;
  },
  updateProgram: async (id: string | number, data: Partial<TrainingProgram>) => {
    const response = await api.put(`/training/programs/${id}`, data);
    return response.data;
  },
  deleteProgram: async (id: string | number) => {
    const response = await api.delete(`/training/programs/${id}`);
    return response.data;
  },

  // ==============================
  // Admin/HR Enrollments
  // ==============================
  getEnrollments: async (page = 1, perPage = 10) => {
    const response = await api.get('/training/enrollments', { params: { page, per_page: perPage } });
    return response.data;
  },
  enrollEmployees: async (programId: string | number, employeeIds: number[]) => {
    const response = await api.post(`/training/programs/${programId}/enroll`, {
      employee_ids: employeeIds,
    });
    return response.data;
  },
  completeTraining: async (enrollmentId: string | number, data?: { score?: number; certificate_path?: string; notes?: string }) => {
    const response = await api.put(`/training/enrollments/${enrollmentId}/complete`, data || {});
    return response.data;
  },
  updateEnrollmentProgress: async (enrollmentId: string | number, data: { score: number; notes?: string }) => {
    const response = await api.put(`/training/enrollments/${enrollmentId}/progress`, data);
    return response.data;
  },
  getProgressHistory: async (enrollmentId: string | number) => {
    const response = await api.get(`/training/enrollments/${enrollmentId}/progress-history`);
    return response.data;
  },
  approveEnrollment: async (id: string | number) => {
    const response = await api.put(`/training/enrollments/${id}/approve`);
    return response.data;
  },
  rejectEnrollment: async (id: string | number) => {
    const response = await api.put(`/training/enrollments/${id}/reject`);
    return response.data;
  },

  // ==============================
  // ESS (Employee Self-Service)
  // ==============================
  getMyTrainings: async (page = 1, perPage = 10) => {
    const response = await api.get('/my/trainings', { params: { page, per_page: perPage } });
    return response.data;
  },
  getAvailableTrainings: async (params?: { search?: string; page?: number; per_page?: number }) => {
    const response = await api.get('/my/trainings/available', { params });
    return response.data;
  },
  selfEnroll: async (id: string | number) => {
    const response = await api.post(`/my/trainings/${id}/enroll`);
    return response.data;
  },

  // ==============================
  // Competencies
  // ==============================
  getCompetencies: async (params?: { per_page?: number; status?: string; search?: string }) => {
    const response = await api.get('/competencies', { params });
    const res = response.data;
    return res?.data || res;
  },
  getMyCompetencies: async () => {
    const response = await api.get('/my/competencies');
    const res = response.data;
    return res?.data || res;
  },
  getEmployeeCompetencies: async (employeeId: string | number) => {
    const response = await api.get(`/competencies/employee/${employeeId}`);
    return response.data;
  },
  assignCompetency: async (competencyId: string | number, employeeIds: number[], data?: { proficiency_level?: number; assessed_at?: string; notes?: string }) => {
    const response = await api.post(`/competencies/${competencyId}/assign`, {
      employee_ids: employeeIds,
      ...data,
    });
    return response.data;
  },
  createCompetency: async (data: { code: string; name: string; category?: string; description?: string; status?: string }) => {
    const response = await api.post('/competencies', data);
    return response.data;
  },
  updateCompetency: async (id: string | number, data: Partial<{ code: string; name: string; category: string | null; description: string | null; status: string }>) => {
    const response = await api.put(`/competencies/${id}`, data);
    return response.data;
  },
  deleteCompetency: async (id: string | number) => {
    const response = await api.delete(`/competencies/${id}`);
    return response.data;
  },
  assessCompetency: async (assignmentId: string | number, proficiency_level: number, notes?: string) => {
    const response = await api.post(`/competencies/assignment/${assignmentId}/assess`, {
      proficiency_level,
      notes,
    });
    return response.data;
  },
};
