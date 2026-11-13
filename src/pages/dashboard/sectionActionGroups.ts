import { api } from '@/shared/api/httpClient';

type SectionActionContext = {
  path: string;
  formState: Record<string, string>;
  selectedDocumentFile: File | null;
  buildPayloadByKeys: (keys: string[]) => Record<string, string>;
  buildProfilePayload: () => Record<string, string>;
  getRequiredId: (label: string, field?: string) => string;
  getRequiredProfileId: () => string;
};

const parseNumericIds = (value: string | undefined, fieldName: string) => {
  const ids = (value ?? '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);

  if (ids.length === 0) {
    throw new Error(`${fieldName} wajib diisi (pisahkan dengan koma).`);
  }

  return ids;
};

const parseJsonArray = (value: string | undefined, fieldName: string) => {
  if (!value?.trim()) {
    throw new Error(`${fieldName} wajib berupa JSON array.`);
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error('invalid');
    }
    return parsed;
  } catch {
    throw new Error(`${fieldName} harus valid JSON array.`);
  }
};

const getCreateActions = (ctx: SectionActionContext) => ({
  createProfile: () => api.post('/profiles', ctx.buildProfilePayload()),
  createEmployee: () =>
    api.post('/employees', ctx.buildPayloadByKeys(['user_id', 'manager_id', 'employee_code', 'position', 'department', 'hire_date', 'salary', 'status', 'location_id', 'work_schedule_id'])),
  createLeave: () => {
    const payload = ctx.buildPayloadByKeys(['type', 'leave_type', 'start_date', 'end_date', 'total_days', 'reason']);
    return api.post('/leaves', {
      ...payload,
      type: payload.type || payload.leave_type,
    });
  },
  createLeavePolicy: () => {
    const { id: _id, ...payload } = ctx.formState;
    return api.post('/leave-policies', payload);
  },
  createLeaveType: () => {
    const { id: _id, ...payload } = ctx.formState;
    return api.post('/leave-types', payload);
  },
  createReimbursement: () =>
    api.post('/my/reimbursements', ctx.buildPayloadByKeys(['title', 'description', 'amount', 'category', 'expense_date', 'receipt_path'])),
  createAsset: () => api.post('/assets', ctx.buildPayloadByKeys(['asset_code', 'name', 'category', 'cost', 'purchase_date', 'location_id'])),
  createTrainingProgram: () => {
    const payload = ctx.buildPayloadByKeys(['name', 'title', 'code', 'category', 'description', 'provider', 'mode', 'duration_hours', 'start_date', 'end_date', 'budget', 'status']);
    return api.post('/training/programs', {
      ...payload,
      title: payload.title || payload.name,
    });
  },
  createCompetency: () => api.post('/competencies', ctx.buildPayloadByKeys(['name', 'code', 'category', 'level'])),
  createLocation: () => api.post('/locations', ctx.buildPayloadByKeys(['name', 'latitude', 'longitude', 'radius'])),
  createReimbursementAdmin: () =>
    api.post('/reimbursements', ctx.buildPayloadByKeys(['title', 'description', 'amount', 'category', 'expense_date', 'receipt_path'])),
  createApprovalFlow: () => {
    const roleIds = parseNumericIds(ctx.formState.role_ids, 'role_ids');
    const steps = roleIds.map((roleId, index) => ({ step_order: index + 1, role_id: roleId }));

    return api.post('/approval-flows', {
      name: ctx.formState.name,
      module: ctx.formState.module,
      steps,
    });
  },
  createPerformanceCycle: () =>
    api.post('/performance/cycles', ctx.buildPayloadByKeys(['name', 'period_type', 'year', 'quarter', 'start_date', 'end_date', 'status', 'description'])),
  createPerformanceReview: () =>
    api.post('/performance/reviews', ctx.buildPayloadByKeys(['review_cycle_id', 'employee_id', 'reviewer_user_id', 'kpi_id', 'score', 'strengths', 'improvements', 'feedback', 'reviewer_comment'])),
  createCareerIdp: () =>
    api.post('/career/idps', ctx.buildPayloadByKeys(['employee_id', 'review_cycle_id', 'goal_title', 'goal_description', 'status', 'target_date', 'mentor_user_id'])),
  createCareerSuccession: () =>
    api.post('/career/succession', ctx.buildPayloadByKeys(['position_key', 'employee_id', 'readiness', 'talent_score', 'notes'])),
  createEngagementSurvey: () =>
    api.post('/engagement/surveys', {
      ...ctx.buildPayloadByKeys(['title', 'survey_type', 'start_date', 'end_date', 'anonymous', 'status']),
      anonymous: ctx.formState.anonymous === 'true',
      questions: parseJsonArray(ctx.formState.questions_json, 'questions_json'),
    }),
  createWorkforceHolidayCalendar: () =>
    api.post('/workforce/holidays', {
      ...ctx.buildPayloadByKeys(['name', 'year', 'active']),
      active: ctx.formState.active !== 'false',
      dates: parseJsonArray(ctx.formState.dates_json, 'dates_json'),
    }),
  createWorkforceShiftSwap: () =>
    api.post('/workforce/shift-swaps', ctx.buildPayloadByKeys(['requester_employee_id', 'target_employee_id', 'swap_date', 'reason'])),
  createWorkforceOvertimeRule: () =>
    api.post('/workforce/overtime-rules', {
      ...ctx.buildPayloadByKeys(['name', 'department', 'location_id', 'min_minutes', 'multiplier', 'requires_approval', 'active']),
      requires_approval: ctx.formState.requires_approval !== 'false',
      active: ctx.formState.active !== 'false',
    }),
});

const getUpdateActions = (ctx: SectionActionContext) => ({
  updateProfile: () => {
    const id = ctx.getRequiredProfileId();
    return api.put(`/profiles/${id}`, ctx.buildProfilePayload());
  },
  updateLeaveRequest: () => {
    const id = ctx.getRequiredId('Leave ID');
    return api.put(`/leaves/${id}`, ctx.buildPayloadByKeys(['leave_type', 'start_date', 'end_date', 'total_days', 'reason']));
  },
  updateLeavePolicy: () => {
    const id = ctx.getRequiredId('Policy ID');
    const { id: _id, ...payload } = ctx.formState;
    return api.put(`/leave-policies/${id}`, payload);
  },
  updateLeaveType: () => {
    const id = ctx.getRequiredId('Type ID');
    const { id: _id, ...payload } = ctx.formState;
    return api.put(`/leave-types/${id}`, payload);
  },
  updateWorkforceShiftSwap: () => {
    const id = ctx.getRequiredId('Shift Swap ID');
    return api.put(`/workforce/shift-swaps/${id}`, {
      status: ctx.formState.status,
    });
  },
});

const getDeleteActions = (ctx: SectionActionContext) => ({
  deleteProfile: () => {
    const id = ctx.getRequiredProfileId();
    return api.delete(`/profiles/${id}`);
  },
  deleteLeavePolicy: () => {
    const id = ctx.getRequiredId('Policy ID');
    return api.delete(`/leave-policies/${id}`);
  },
  deleteLeaveType: () => {
    const id = ctx.getRequiredId('Type ID');
    return api.delete(`/leave-types/${id}`);
  },
  cancelLeaveRequest: () => {
    const id = ctx.getRequiredId('Leave ID');
    return api.delete(`/leaves/${id}`);
  },
});

const getReadActions = (ctx: SectionActionContext) => ({
  getProfileDetail: () => {
    const id = ctx.getRequiredProfileId();
    return api.get(`/profiles/${id}`);
  },
  submitMyPayroll: () => api.get('/my/payroll'),
  getMyPayrollSlip: () => {
    const id = ctx.getRequiredId('Payroll ID');
    return api.get(`/my/payroll/${id}/slip`);
  },
  exportMyPayrollCsv: () => {
    const id = ctx.getRequiredId('Payroll ID');
    return api.get(`/my/payroll/${id}/export`);
  },
  exportMyPayrollPdf: () => {
    const id = ctx.getRequiredId('Payroll ID');
    return api.get(`/my/payroll/${id}/export-pdf`);
  },
  getNotificationUnreadCount: () => api.get('/notifications/unread-count'),
});

const getWorkflowActions = (ctx: SectionActionContext) => ({
  startOnboarding: () => {
    const id = ctx.getRequiredId('Employee ID');
    return api.put(`/employees/${id}/onboarding/start`, { probation_end_date: ctx.formState.probation_end_date });
  },
  completeOnboarding: () => {
    const id = ctx.getRequiredId('Employee ID');
    return api.put(`/employees/${id}/onboarding/complete`);
  },
  startOffboarding: () => {
    const id = ctx.getRequiredId('Employee ID');
    return api.put(`/employees/${id}/offboarding/start`, { 
      termination_date: ctx.formState.termination_date,
      termination_reason: ctx.formState.termination_reason
    });
  },
  completeOffboarding: () => {
    const id = ctx.getRequiredId('Employee ID');
    return api.put(`/employees/${id}/offboarding/complete`);
  },
  approveLeave: () => {
    const id = ctx.getRequiredId('Leave ID');
    return api.put(`/leaves/${id}/approve`, { approval_note: ctx.formState.approval_notes });
  },
  rejectLeave: () => {
    const id = ctx.getRequiredId('Leave ID');
    return api.put(`/leaves/${id}/reject`, { rejection_note: ctx.formState.approval_notes });
  },
  checkIn: () => api.post('/attendance/check-in', ctx.buildPayloadByKeys(['latitude', 'longitude'])),
  checkOut: () => api.post('/attendance/check-out'),
  submitMyReimbursement: () => {
    const id = ctx.getRequiredId('Reimbursement ID');
    return api.post(`/my/reimbursements/${id}/submit`, {});
  },
  approveReimbursement: () => {
    const id = ctx.getRequiredId('Reimbursement ID');
    return api.put(`/reimbursements/${id}/approve`, { approval_note: ctx.formState.approval_note });
  },
  rejectReimbursement: () => {
    const id = ctx.getRequiredId('Reimbursement ID');
    return api.put(`/reimbursements/${id}/reject`, { rejection_note: ctx.formState.rejection_note });
  },
  markReimbursementPaid: () => {
    const id = ctx.getRequiredId('Reimbursement ID');
    return api.put(`/reimbursements/${id}/mark-paid`);
  },
  assignAsset: () => {
    const id = ctx.getRequiredId('Asset ID');
    return api.post(`/assets/${id}/assign`, {
      employee_id: ctx.formState.employee_id,
      assigned_at: ctx.formState.assigned_at,
      expected_return_date: ctx.formState.expected_return_date,
    });
  },
  returnAsset: () => {
    const assignmentId = ctx.getRequiredId('Assignment ID', 'assignment_id');
    return api.put(`/assets/assignments/${assignmentId}/return`, {});
  },
  uploadMyDocument: () => {
    if (!ctx.selectedDocumentFile) {
      throw new Error('File dokumen wajib dipilih.');
    }

    const formData = new FormData();
    Object.entries(ctx.formState).forEach(([key, value]) => {
      if (key !== 'file' && value !== '') {
        formData.append(key, value);
      }
    });
    formData.append('file', ctx.selectedDocumentFile);

    return api.post('/my/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  reviewDocument: () => {
    const id = ctx.getRequiredId('Document ID');
    return api.put(`/documents/${id}/review`, {
      status: ctx.formState.status,
      remarks: ctx.formState.remarks,
    });
  },
  enrollTrainingProgram: () => {
    const id = ctx.getRequiredId('Training Program ID');
    return api.post(`/training/programs/${id}/enroll`, { employee_ids: parseNumericIds(ctx.formState.employee_ids, 'employee_ids') });
  },
  completeTrainingEnrollment: () => {
    const id = ctx.getRequiredId('Enrollment ID');
    return api.put(`/training/enrollments/${id}/complete`, {
      attendance_percentage: ctx.formState.attendance_percentage,
      assessment_score: ctx.formState.assessment_score,
    });
  },
  assignCompetency: () => {
    const id = ctx.getRequiredId('Competency ID');
    return api.post(`/competencies/${id}/assign`, { employee_ids: parseNumericIds(ctx.formState.employee_ids, 'employee_ids') });
  },
  submitKpi: () => api.post(`/my/kpi/${ctx.formState.id}/submit`),
  generatePayroll: () => api.post('/payroll/generate/monthly', { period: ctx.formState.period }),
  approvePayroll: () => {
    const id = ctx.getRequiredId('Payroll ID');
    return api.post(`/payroll/${id}/approve`);
  },
  markPayrollPaid: () => {
    const id = ctx.getRequiredId('Payroll ID');
    return api.post(`/payroll/${id}/pay`);
  },
  assignRoleToUser: () => {
    const id = ctx.getRequiredId('User ID');
    return api.post(`/admin/users/${id}/assign-role`, {
      role_ids: parseNumericIds(ctx.formState.role_ids, 'role_ids'),
    });
  },
  assignPermissionToRole: () => {
    const id = ctx.getRequiredId('Role ID');
    return api.post(`/admin/roles/${id}/assign-permission`, {
      permission_ids: parseNumericIds(ctx.formState.permission_ids, 'permission_ids'),
    });
  },
  markNotificationRead: () => {
    const id = ctx.getRequiredId('Notification ID');
    return api.put(`/notifications/${id}/read`, {});
  },
  markAllNotificationsRead: () => api.put('/notifications/read-all', {}),
});

export const createSectionActionExecutor = (ctx: SectionActionContext): Record<string, () => Promise<any>> => ({
  ...getCreateActions(ctx),
  ...getUpdateActions(ctx),
  ...getDeleteActions(ctx),
  ...getReadActions(ctx),
  ...getWorkflowActions(ctx),
});
