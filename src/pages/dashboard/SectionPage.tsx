import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { api } from '@/shared/api/httpClient';
import { createSectionActionExecutor } from './sectionActionGroups';
import {
  BarChart3,
  Users,
  CalendarDays,
  Clock,
  CreditCard,
  Receipt,
  Target,
  UserCircle,
  Settings,
  Network,
  Briefcase,
  FileText,
  Search,
  MapPin,
  ShieldCheck,
  Plus,
  RefreshCcw,
  CheckCircle,
  XCircle,
  Save,
  Trash2,
  Pencil,
  Eye,
  Send,
  Download,
  Banknote,
  UserPlus,
  Shield,
  FileUp,
  Play,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './SectionPage.css';

type SectionStat = {
  label: string;
  value: string;
  description: string;
  variant: 'warning' | 'success' | 'info' | 'default' | 'danger';
};

type InsightChartData = {
  headcountByDepartment: { category: string; value: number }[];
  leaveType: { name: string; value: number }[];
  helpdeskStatus: { name: string; value: number }[];
};

type CrudMode = 'create' | 'manage';

const splitCrudPaths = new Set(['/profiles', '/leave/requests', '/leave/type', '/leave/policy', '/reimbursements']);

const toFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const getCrudRouteBase = (pathname: string) => {
  for (const basePath of splitCrudPaths) {
    if (pathname === `${basePath}/create` || pathname === `${basePath}/manage`) {
      return basePath;
    }
  }

  return pathname;
};

const getCrudModeFromPath = (pathname: string): CrudMode | null => {
  if (pathname.endsWith('/create')) return 'create';
  if (pathname.endsWith('/manage')) return 'manage';
  return null;
};

const sectionDefinitions: Record<string, { title: string; subtitle: string; icon: any; color: string }> = {
  dashboard: {
     title: 'Ringkasan Dashboard',
     subtitle: 'Ringkasan HRIS utama dengan KPI, aktivitas, dan tren terpenting.',
    icon: BarChart3,
    color: 'var(--color-primary)',
  },
  'hr-summary': {
     title: 'Ringkasan HR',
     subtitle: 'Intisari data SDM, jumlah karyawan, turnover, dan absensi.',
    icon: Users,
    color: 'var(--color-primary)',
  },
  analytics: {
     title: 'Analitik',
     subtitle: 'Analisa performa tim, ketidakhadiran, dan produktivitas secara real-time.',
    icon: BarChart3,
    color: 'var(--color-primary)',
  },
  employees: {
     title: 'Manajemen Karyawan',
     subtitle: 'Kelola data karyawan, posisi, dan struktur organisasi.',
    icon: Users,
    color: 'var(--color-primary)',
  },
  organization: {
     title: 'Struktur Organisasi',
     subtitle: 'Atur departemen dan posisi di perusahaan.',
    icon: Network,
    color: 'var(--color-primary)',
  },
  employment: {
     title: 'Manajemen Kepegawaian',
     subtitle: 'Status kerja, riwayat gaji, dan data karir karyawan.',
    icon: Briefcase,
    color: 'var(--color-primary)',
  },
  documents: {
     title: 'Dokumen',
     subtitle: 'Dokumen karyawan seperti KTP, kontrak, dan lainnya.',
    icon: FileText,
    color: 'var(--color-primary)',
  },
  attendance: {
     title: 'Absensi',
     subtitle: 'Lihat kehadiran harian, timesheet, shift, dan lembur.',
    icon: Clock,
    color: 'var(--color-primary)',
  },
  leave: {
     title: 'Manajemen Cuti',
     subtitle: 'Kelola izin, saldo cuti, dan kalender cuti karyawan.',
    icon: CalendarDays,
    color: 'var(--color-primary)',
  },
  payroll: {
     title: 'Penggajian',
     subtitle: 'Proses gaji, slip, komponen upah, dan laporan payroll.',
    icon: CreditCard,
    color: 'var(--color-primary)',
  },
  expense: {
     title: 'Reimburse',
     subtitle: 'Klaim biaya operasional dan persetujuan reimburse.',
    icon: Receipt,
    color: 'var(--color-primary)',
  },
  performance: {
     title: 'Performa',
     subtitle: 'Tujuan, review, dan feedback karyawan. Kelola KPI di menu terpisah.',
    icon: Target,
    color: 'var(--color-primary)',
  },
  ess: {
     title: 'Layanan Mandiri Karyawan',
     subtitle: 'Akses mandiri karyawan untuk profil, absen, dan slip gaji.',
    icon: UserCircle,
    color: 'var(--color-primary)',
  },
  reports: {
     title: 'Laporan & Analitik',
     subtitle: 'Laporan SDM, absensi, cuti, payroll, dan analitik.',
    icon: FileText,
    color: 'var(--color-primary)',
  },
  assets: {
     title: 'Aset & Inventaris',
     subtitle: 'Kelola aset perusahaan, penugasan, dan pengembalian aset.',
    icon: Briefcase,
    color: 'var(--color-primary)',
  },
  training: {
     title: 'Program Pelatihan',
     subtitle: 'Rancang program pelatihan dan pantau kepesertaan.',
    icon: Target,
    color: 'var(--color-primary)',
  },
  competencies: {
     title: 'Manajemen Kompetensi',
     subtitle: 'Kelola matriks kompetensi dan penugasan ke karyawan.',
    icon: Target,
    color: 'var(--color-primary)',
  },
  // requests: {
  //    title: 'Permintaan Layanan HR',
  //    subtitle: 'Pantau tiket HR, penugasan PIC, dan update status request.',
  //   icon: FileText,
  //   color: 'var(--color-primary)',
  // },
  notifications: {
     title: 'Pusat Notifikasi',
     subtitle: 'Notifikasi approval, pengingat, dan update status lintas modul.',
    icon: Settings,
    color: 'var(--color-primary)',
  },
  insights: {
     title: 'Insight SDM',
     subtitle: 'Dashboard insight lintas absensi, cuti, payroll, reimburse, dan pelatihan.',
    icon: BarChart3,
    color: 'var(--color-primary)',
  },
  settings: {
     title: 'Pengaturan Sistem',
     subtitle: 'Pengaturan perusahaan, pengguna, peran, dan master data.',
    icon: Settings,
    color: 'var(--color-primary)',
  },
  '/my/kpi': {
     title: 'KPI Saya',
     subtitle: 'Cek KPI pribadi dan submit target yang sudah selesai.',
    icon: Target,
    color: 'var(--color-primary)',
  },
  '/my/reimbursements': {
     title: 'Reimburse Saya',
     subtitle: 'Lihat klaim Anda dan ajukan reimburse baru.',
    icon: Receipt,
    color: 'var(--color-primary)',
  },
  '/attendance/check-in': {
     title: 'Absen Masuk',
     subtitle: 'Pencatatan kehadiran (check-in) lokasi.',
    icon: MapPin,
    color: 'var(--color-primary)',
  },
  '/attendance/check-out': {
     title: 'Absen Pulang',
     subtitle: 'Pencatatan pulang kerja (check-out).',
    icon: MapPin,
    color: 'var(--color-primary)',
  },
  '/attendance/history': {
     title: 'Riwayat Absensi',
     subtitle: 'Lihat riwayat absensi harian dan jam kerja Anda.',
    icon: CalendarDays,
    color: 'var(--color-primary)',
  },
  '/attendance/today': {
     title: 'Absensi Hari Ini',
     subtitle: 'Lihat status kehadiran hari ini dan jam masuk/pulang terbaru.',
    icon: CalendarDays,
    color: 'var(--color-primary)',
  },
   '/profiles': {
     title: 'Profil Karyawan',
     subtitle: 'Kelola profil karyawan dan informasi kontak.',
    icon: UserCircle,
    color: 'var(--color-primary)',
  },
  '/my/profile': {
     title: 'Profil Saya',
     subtitle: 'Lihat dan kelola informasi profil pribadi Anda.',
    icon: UserCircle,
    color: 'var(--color-primary)',
  },
  '/my/payroll': {
     title: 'Payroll Saya',
     subtitle: 'Lihat ringkasan payroll pribadi Anda.',
    icon: CreditCard,
    color: 'var(--color-primary)',
  },
  '/locations': {
     title: 'Lokasi',
     subtitle: 'Kelola wilayah dan radius lokasi absensi.',
    icon: MapPin,
    color: 'var(--color-primary)',
  },
  '/admin/users': {
     title: 'Manajemen Pengguna',
     subtitle: 'Kelola akun administrator dan karyawan.',
    icon: UserCircle,
    color: 'var(--color-primary)',
  },
  '/admin/roles': {
     title: 'Manajemen Peran',
     subtitle: 'Tetapkan peran dan level akses pengguna.',
    icon: ShieldCheck,
    color: 'var(--color-primary)',
  },
  '/admin/permissions': {
     title: 'Izin Akses',
     subtitle: 'Kelola izin pada setiap fitur sistem.',
    icon: ShieldCheck,
    color: 'var(--color-primary)',
  },
  '/attendance/timesheet': {
     title: 'Timesheet Karyawan',
     subtitle: 'Daftar rincian jam kerja harian dan total durasi kerja.',
    icon: Clock,
    color: 'var(--color-primary)',
  },
  '/attendance/overtime': {
     title: 'Daftar Lembur',
     subtitle: 'Ringkasan pengajuan dan persetujuan jam lembur karyawan.',
    icon: Clock,
    color: 'var(--color-primary)',
  },
  '/attendance/reports': {
     title: 'Laporan Kehadiran',
     subtitle: 'Analisa mendalam mengenai tren absensi dan kepatuhan waktu.',
    icon: FileBarChart,
    color: 'var(--color-primary)',
  },
  '/attendance/daily': {
    title: 'Monitoring Kehadiran',
    subtitle: 'Pantau status kehadiran seluruh karyawan hari ini secara real-time.',
    icon: Users,
    color: 'var(--color-primary)',
  },
  '/payroll/component/allowance': {
     title: 'Manajemen Tunjangan',
     subtitle: 'Kelola komponen pendapatan tambahan (allowance) karyawan.',
    icon: Banknote,
    color: 'var(--color-primary)',
  },
  '/payroll/component/deduction': {
    title: 'Manajemen Potongan',
    subtitle: 'Kelola komponen potongan gaji (deduction) karyawan.',
    icon: CreditCard,
    color: 'var(--color-primary)',
  },
  '/leave/balance': {
    title: 'Saldo Cuti',
    subtitle: 'Lihat ringkasan saldo cuti tahunan dan jenis cuti lainnya.',
    icon: CalendarDays,
    color: 'var(--color-primary)',
  },
  '/leave/calendar': {
    title: 'Kalender Cuti',
    subtitle: 'Lihat jadwal cuti seluruh karyawan dalam format kalender.',
    icon: CalendarDays,
    color: 'var(--color-primary)',
  },
  '/leave/my-leave': {
    title: 'Cuti Saya',
    subtitle: 'Lihat riwayat pengajuan cuti pribadi dan sisa saldo cuti Anda.',
    icon: CalendarDays,
    color: 'var(--color-primary)',
  },
  '/leave/type': {
    title: 'Jenis Cuti',
    subtitle: 'Kelola berbagai kategori cuti yang tersedia untuk karyawan.',
    icon: CalendarDays,
    color: 'var(--color-primary)',
  },
  '/leave/policy': {
    title: 'Kebijakan Cuti',
    subtitle: 'Atur aturan cuti tahunan, jatah hari, dan carry forward.',
    icon: CalendarDays,
    color: 'var(--color-primary)',
  },
};

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' ? (value as UnknownRecord) : {};

const unwrapPayload = (raw: unknown) => {
  const root = toRecord(raw);
  return root.data ?? raw;
};

const getNumericValue = (raw: unknown): number | null => {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const getCountFromPayload = (raw: unknown): number => {
  const payload = unwrapPayload(raw);

  if (Array.isArray(payload)) {
    return payload.length;
  }

  const payloadRecord = toRecord(payload);
  const arrayCandidates = [payloadRecord.items, payloadRecord.rows, payloadRecord.data, payloadRecord.results];

  for (const candidate of arrayCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.length;
    }
  }

  const numericCandidates = [
    payloadRecord.count,
    payloadRecord.total,
    payloadRecord.total_count,
    payloadRecord.totalCount,
    payloadRecord.present,
    payloadRecord.present_count,
    payloadRecord.presentCount,
    payloadRecord.total_present,
    payloadRecord.totalPresent,
  ];

  for (const candidate of numericCandidates) {
    const numericValue = getNumericValue(candidate);
    if (numericValue !== null) {
      return numericValue;
    }
  }

  return 0;
};

const getFormattedTitle = (path: string) => {
  if (path === '/dashboard' || path === '/') return 'Dashboard Overview';
  const cleaned = path.replace(/^\//, '').replace(/\//g, ' ');
  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getSectionTableKey = (pathname: string) => {
  if (pathname === '/my/kpi') return 'kpis';
  if (pathname === '/my/reimbursements') return 'reimbursements';
  if (pathname === '/my/payroll') return 'payroll';
  if (pathname === '/my/assets' || pathname.startsWith('/assets/')) return 'assets';
  if (pathname === '/my/trainings' || pathname.startsWith('/training/')) return 'training';
  if (pathname === '/my/competencies' || pathname.startsWith('/competencies')) return 'competencies';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/insights/')) return 'insights';
  if (pathname.startsWith('/admin/')) return 'admin';
  if (pathname.startsWith('/attendance/')) return 'attendance';
  if (pathname.startsWith('/documents/')) return 'documents';
  if (pathname.startsWith('/organization/')) return 'organization';
  if (pathname.startsWith('/employment/')) return 'employment';
  if (pathname.startsWith('/leave/')) return 'leave';
  if (pathname.startsWith('/payroll/component/')) return 'payroll';
  if (pathname.startsWith('/payroll/')) return 'payroll';
  if (pathname.startsWith('/expense/')) return 'expense';
  if (pathname.startsWith('/performance/')) return 'performance';
  if (pathname.startsWith('/career/')) return 'career';
  if (pathname.startsWith('/engagement/')) return 'engagement';
  if (pathname.startsWith('/workforce/')) return 'workforce';
  if (pathname.startsWith('/compliance/')) return 'compliance';
  if (pathname.startsWith('/approval-flows')) return 'approval_flows';
  if (pathname.startsWith('/ess/')) return 'ess';
  if (pathname.startsWith('/reports/')) return 'reports';
  if (pathname.startsWith('/settings/')) return 'settings';
  if (pathname === '/reimbursements') return 'reimbursements';
  if (pathname === '/profiles') return 'profiles';
  if (pathname === '/locations') return 'locations';
  if (pathname === '/kpis') return 'kpis';
  return pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
};

const getSectionData = (pathname: string) => {
  const predefined = sectionDefinitions[pathname] || sectionDefinitions[pathname.split('/')[1]];
  const title = predefined?.title || getFormattedTitle(pathname);
  const subtitle = predefined?.subtitle || 'Halaman ini siap diisi dengan data dan fungsionalitas lengkap.';
  const icon = predefined?.icon || FileText;
  const color = predefined?.color || 'var(--color-primary)';

  const root = getSectionTableKey(pathname);

  const tableColumns: Record<string, string[]> = {
    employees: ['Name', 'Department', 'Position', 'Status', 'Actions'],
    organization: ['Name', 'Type', 'Manager', 'Members', 'Status', 'Actions'],
    employment: ['Employee', 'Position', 'Start Date', 'Salary', 'Status'],
    documents: ['Document', 'Employee', 'Type', 'Expired', 'Status'],
    attendance: ['Date', 'Present', 'Absent', 'Overtime', 'Status', 'Actions'],
    leave: ['Employee', 'Leave Type', 'Start', 'End', 'Status', 'Actions'],
    payroll: ['Payroll Period', 'Employees', 'Total', 'Status', 'Actions'],
    expense: ['Title', 'Category', 'Amount', 'Status', 'Date'],
    assets: ['Asset', 'Category', 'Assigned To', 'Status', 'Updated'],
    training: ['Program', 'Category', 'Start Date', 'Capacity', 'Status'],
    competencies: ['Competency', 'Category', 'Level', 'Mandatory', 'Status'],
    notifications: ['Type', 'Title', 'Created At', 'Read', 'Status'],
    insights: ['Metric', 'Value', 'Window', 'Status'],
    ess: ['Feature', 'Status', 'Last Updated'],
    reports: ['Report Name', 'Category', 'Updated', 'Status'],
    settings: ['Setting', 'Module', 'Updated', 'Status'],
    career: ['Plan', 'Employee', 'Target Date', 'Status', 'Updated'],
    engagement: ['Survey', 'Type', 'Start', 'End', 'Status'],
    workforce: ['Policy', 'Department', 'Schedule', 'Status', 'Updated'],
    compliance: ['Metric', 'Value', 'Window', 'Status', 'Updated'],
    approval_flows: ['Flow', 'Module', 'Steps', 'Status', 'Updated'],
    profiles: ['Name', 'Email', 'Phone', 'City', 'Status', 'Actions'],
    locations: ['Location', 'Latitude', 'Longitude', 'Radius', 'Status', 'Actions'],
    kpis: ['Title', 'Employee', 'Target', 'Progress', 'Status', 'Actions'],
    reimbursements: ['Title', 'Category', 'Amount', 'Status', 'Date', 'Actions'],
    admin: ['Entity', 'Role / Access', 'Updated', 'Status', 'Actions'],
    dashboard: ['Metric', 'Value', 'Trend', 'Status'],
  };

  const safeRoot = tableColumns[root] ? root : 'dashboard';

  return {
    title,
    subtitle,
    icon,
    color,
    stats: [] as SectionStat[],
    tableColumns: tableColumns[safeRoot],
  };
};

const supportsList = (pathname: string) => {
  const basePath = getCrudRouteBase(pathname);

  return (
    [
      '/profiles',
      '/employees',
      '/leave/requests',
      '/leave/my-leave',
      '/leave/type',
      '/leave/policy',
      '/attendance',
      '/attendance/daily',
      '/attendance/timesheet',
      '/attendance/shifts',
      '/attendance/overtime',
      '/attendance/reports',
      '/attendance/history',
      '/attendance/today',
      '/payroll',
      '/payroll/tax',
      '/payroll/reports',
      '/reimbursements',
      '/expense/submit',
      '/expense/list',
      '/expense/approval',
      '/expense/categories',
      '/expense/reports',
      '/my/reimbursements',
      '/my/kpi',
      '/my/payroll',
      '/my/assets',
      '/assets',
      '/assets/assignments',
      '/my/documents',
      '/documents/review',
      '/documents/expiring',
      '/training/programs',
      '/training/enrollments',
      '/my/trainings',
      '/competencies',
      '/my/competencies',
      '/notifications',
      '/insights/people/detailed',
      '/organization/directory',
      '/organization/summary',
      '/organization/chart',
      '/organization/team',
      '/organization/master-data',
      '/approval-flows',
      '/compliance/overview',
      '/compliance/audit-summary',
      '/compliance/expiring-documents',
      '/reports/dashboard-summary',
      '/reports/competency',
      '/reports/employee-lifecycle',
      '/reports/assets',
      '/performance/summary',
      '/performance/cycles',
      '/performance/reviews',
      '/career/idps',
      '/career/succession',
      '/engagement/surveys',
      '/workforce/holidays',
      '/workforce/shift-swaps',
      '/workforce/overtime-rules',
      '/reports/attendance',
      '/reports/leave',
      '/reports/payroll',
      '/reports/custom',
      '/settings/company',
      '/settings/user-role',
      '/settings/permissions',
      '/settings/master-data/department',
      '/settings/master-data/position',
      '/settings/master-data/leave-type',
      '/settings/notification',
      '/settings/logs',
      '/locations',
      '/admin/users',
      '/admin/roles',
      '/admin/permissions',
    ].includes(basePath)
  );
};

const getDefaultFormState = (pathname: string) => {
  switch (pathname) {
    case '/profiles':
      return { id: '', phone: '', address: '', city: '', province: '', postal_code: '' };
    case '/employees':
      return { id: '', lifecycle_notes: '' };
    case '/employees/add':
      return { user_id: '', employee_code: '', position: '', department: '', hire_date: '', salary: '' };
    case '/leave/requests':
      return { id: '', leave_type: '', start_date: '', end_date: '', total_days: '', reason: '' };
    case '/leave/type':
      return { id: '', name: '', code: '', description: '', is_paid: 'true', is_active: 'true' };
    case '/leave/policy':
      return { id: '', name: '', policy_code: '', year: new Date().getFullYear().toString(), annual_allowance: '12', carry_over_allowance: '0', max_carryover_days: '5', entitlement_type: 'fixed', entitlement_value: '12', is_paid: 'true', active: 'true' };
    case '/profiles':
      return { id: '', phone: '', address: '', birth_date: '', gender: '', nationality: '', id_number: '', bank_name: '', bank_account_number: '', tax_number: '' };
    case '/leave/balance':
      return { id: '' };
    case '/attendance/check-in':
      return { latitude: '', longitude: '' };
    case '/attendance/check-out':
      return {};
    case '/my/reimbursements':
      return { id: '', title: '', description: '', amount: '', category: '', expense_date: '', receipt_path: '' };
    case '/assets':
      return {
        asset_code: '',
        name: '',
        category: '',
        cost: '',
        purchase_date: '',
        location_id: '',
      };
    case '/assets/assignments':
      return { id: '', employee_id: '', assigned_at: '', expected_return_date: '', assignment_id: '' };
    case '/my/documents':
      return { document_type: '', document_number: '', issue_date: '', expiry_date: '', issuing_authority: '', file: '' };
    case '/documents/review':
      return { id: '', status: '', remarks: '' };
    case '/training/programs':
      return { title: '', description: '', provider: '', mode: 'online', start_date: '', end_date: '', budget: '', status: 'draft' };
    case '/training/enrollments':
      return { id: '', employee_ids: '', attendance_percentage: '', assessment_score: '' };
    case '/competencies':
      return { name: '', code: '', category: '', level: '' };
    case '/my/competencies':
      return { id: '', employee_ids: '' };
    case '/notifications':
      return { id: '' };
    case '/my/kpi':
      return { id: '' };
    case '/my/payroll':
      return { id: '', employee_id: '', period: '' };
    case '/payroll':
      return { id: '', period: '', remarks: '' };
    case '/locations':
      return { name: '', latitude: '', longitude: '', radius: '' };
    case '/reimbursements':
      return { id: '', employee_id: '', title: '', description: '', amount: '', category: '', expense_date: '', receipt_path: '', approval_note: '', rejection_note: '' };
    case '/expense/approval':
      return { id: '', approval_note: '', rejection_note: '' };
    case '/reports/attendance':
      return { window_days: '30', start_date: '', end_date: '' };
    case '/reports/leave':
      return { year: '', status: '', start_date: '', end_date: '' };
    case '/reports/payroll':
      return { period: '', status: '', start_date: '', end_date: '' };
    case '/reports/custom':
      return { window_days: '30', expiring_days: '30' };
    case '/reports/dashboard-summary':
      return {};
    case '/reports/competency':
      return {};
    case '/reports/employee-lifecycle':
      return { year: '' };
    case '/reports/assets':
      return {};
    case '/approval-flows':
      return { name: '', module: '', role_ids: '' };
    case '/performance/cycles':
      return { name: '', period_type: 'quarterly', year: '', quarter: '', start_date: '', end_date: '', status: 'open', description: '' };
    case '/performance/reviews':
      return { review_cycle_id: '', employee_id: '', reviewer_user_id: '', kpi_id: '', score: '', strengths: '', improvements: '', feedback: '', reviewer_comment: '' };
    case '/career/idps':
      return { employee_id: '', review_cycle_id: '', goal_title: '', goal_description: '', status: 'draft', target_date: '', mentor_user_id: '' };
    case '/career/succession':
      return { position_key: '', employee_id: '', readiness: 'ready_1_2_years', talent_score: '', notes: '' };
    case '/engagement/surveys':
      return { title: '', survey_type: 'pulse', start_date: '', end_date: '', anonymous: 'true', status: 'draft', questions_json: '[{"question_type":"rating","question_text":"How satisfied are you?","required":true}]' };
    case '/workforce/holidays':
      return { name: '', year: '', active: 'true', dates_json: '[{"holiday_date":"2026-05-01","name":"Labour Day","is_national":true}]' };
    case '/workforce/shift-swaps':
      return { id: '', requester_employee_id: '', target_employee_id: '', swap_date: '', reason: '', status: 'approved' };
    case '/workforce/overtime-rules':
      return { name: '', department: '', location_id: '', min_minutes: '', multiplier: '', requires_approval: 'true', active: 'true' };
    case '/organization/team':
      return { manager_user_id: '' };
    case '/compliance/expiring-documents':
      return { days: '30' };
    case '/admin/users':
      return { id: '', role_ids: '' };
    case '/admin/roles':
      return { id: '', permission_ids: '' };
    case '/admin/permissions':
      return {};
    case '/leave/type':
      return { id: '', name: '', code: '', description: '', is_paid: 'true', is_active: 'true' };
    case '/leave/policy':
      return { id: '', name: '', policy_code: '', year: new Date().getFullYear().toString(), annual_allowance: '12', carry_over_allowance: '0', max_carryover_days: '5', entitlement_type: 'fixed', entitlement_value: '12', is_paid: 'true', active: 'true' };
    default:
      return {} as Record<string, string>;
  }
};

const formatVal = (val: unknown): string => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) {
    if (val.length === 0) return '-';
    // Handle nested arrays of objects (like periods or dates)
    return val.map(item => {
      if (typeof item === 'object' && item !== null) {
        const v = item as Record<string, unknown>;
        if (v.start_date && v.end_date) return `${v.start_date} - ${v.end_date}`;
        if (v.name) return String(v.name);
        return JSON.stringify(item);
      }
      return String(item);
    }).join(', ');
  }
  if (typeof val === 'object') {
    try {
      const v = val as Record<string, unknown>;
      if (v.name) return String(v.name);
      if (v.label) return String(v.label);
      if (v.title) return String(v.title);
      if (v.email) return String(v.email);
      if (v.employee_code) return String(v.employee_code);
      
      const keys = Object.keys(v).filter(k => typeof v[k] !== 'object' && k !== 'id').slice(0, 3);
      if (keys.length > 0) {
        return keys.map(k => `${k}: ${v[k]}`).join(', ');
      }
      
      return JSON.stringify(val);
    } catch {
      return '[Object]';
    }
  }
  return String(val);
};

const parsePayloadToTable = (payload: unknown) => {
  if (!payload) return { columns: ['Result'], rows: [['No data available']] };

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return { columns: ['Result'], rows: [['No data available']] };
    }

    const first = payload[0] as Record<string, unknown>;
    const columns = Object.keys(first).filter((k) => k !== 'created_at' && k !== 'updated_at' && k !== 'deleted_at');
    
    return {
      columns,
      rows: payload.map((item) => columns.map((col) => {
        if (col === 'id') return (item as Record<string, unknown>)[col];
        return formatVal((item as Record<string, unknown>)[col]);
      })),
    };
  }

  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>;
    const columns = Object.keys(obj).filter((k) => k !== 'created_at' && k !== 'updated_at' && k !== 'deleted_at');
    return {
      columns: columns.length ? columns : ['Result'],
      rows: [columns.map((key) => {
        if (key === 'id') return obj[key];
        return formatVal(obj[key]);
      })],
    };
  }

  return { columns: ['Result'], rows: [[String(payload)]] };
};

const selectOptionsByField: Record<string, string[]> = {
  status: ['open', 'assigned', 'in_progress', 'completed', 'closed', 'pending', 'approved', 'rejected', 'submitted', 'paid'],
  priority: ['low', 'medium', 'high', 'urgent'],
  entitlement_type: ['fixed', 'accrual', 'unlimited'],
  period_type: ['monthly', 'quarterly', 'yearly'],
  survey_type: ['pulse', 'annual', 'ad_hoc'],
  readiness: ['ready_now', 'ready_1_2_years', 'ready_3_5_years'],
  mode: ['online', 'offline', 'hybrid'],
  category: ['travel', 'meals', 'office_supplies', 'client_entertainment', 'other'],
  anonymous: ['true', 'false'],
  active: ['true', 'false'],
  requires_approval: ['true', 'false'],
  is_paid: ['true', 'false'],
  is_active: ['true', 'false'],
};

const dateFields = new Set(['start_date', 'end_date', 'hire_date', 'expense_date', 'issue_date', 'expiry_date', 'assigned_at', 'expected_return_date', 'period', 'target_date', 'swap_date']);
const numberFields = new Set(['amount', 'salary', 'duration_hours', 'level', 'radius', 'latitude', 'longitude', 'entitlement_value', 'max_carryover_days', 'per_page', 'window_days', 'expiring_days', 'year', 'quarter', 'score', 'weight', 'target_value', 'feeders_required', 'talent_score', 'budget', 'min_minutes', 'multiplier', 'days']);
const textareaFields = new Set(['description', 'reason', 'remarks', 'approval_notes', 'approval_note', 'rejection_note', 'completion_notes', 'comment_text', 'lifecycle_notes', 'strengths', 'improvements', 'feedback', 'reviewer_comment', 'goal_description', 'notes', 'questions_json', 'dates_json']);

const routeActionMatrix: Record<string, string[]> = {
  '/profiles': ['createProfile', 'getProfileDetail', 'updateProfile', 'deleteProfile'],
  '/employees/add': ['createEmployee'],
  '/employees': ['startOnboarding', 'completeOnboarding', 'startOffboarding', 'completeOffboarding'],
  '/leave/requests': ['createLeave', 'updateLeaveRequest', 'cancelLeaveRequest'],
  '/leave/type': ['createLeaveType', 'updateLeaveType', 'deleteLeaveType'],
  '/leave/policy': ['createLeavePolicy', 'updateLeavePolicy', 'deleteLeavePolicy'],
  '/attendance/check-in': ['checkIn'],
  '/attendance/check-out': ['checkOut'],
  '/my/reimbursements': ['createReimbursement', 'submitMyReimbursement'],
  '/assets': ['createAsset'],
  '/assets/assignments': ['assignAsset', 'returnAsset'],
  '/my/documents': ['uploadMyDocument'],
  '/documents/review': ['reviewDocument'],
  '/training/programs': ['createTrainingProgram'],
  '/training/enrollments': ['enrollTrainingProgram', 'completeTrainingEnrollment'],
  '/competencies': ['createCompetency', 'assignCompetency'],
  '/my/competencies': ['createCompetency', 'assignCompetency'],
  '/approval-flows': ['createApprovalFlow'],
  '/performance/cycles': ['createPerformanceCycle'],
  '/performance/reviews': ['createPerformanceReview'],
  '/career/idps': ['createCareerIdp'],
  '/career/succession': ['createCareerSuccession'],
  '/engagement/surveys': ['createEngagementSurvey'],
  '/workforce/holidays': ['createWorkforceHolidayCalendar'],
  '/workforce/shift-swaps': ['createWorkforceShiftSwap', 'updateWorkforceShiftSwap'],
  '/workforce/overtime-rules': ['createWorkforceOvertimeRule'],
  '/notifications': ['markNotificationRead', 'markAllNotificationsRead', 'getNotificationUnreadCount'],
  '/my/kpi': ['submitKpi'],
  '/payroll': ['generatePayroll', 'approvePayroll', 'markPayrollPaid'],
  '/locations': ['createLocation'],
  '/reimbursements': ['createReimbursementAdmin', 'approveReimbursement', 'rejectReimbursement', 'markReimbursementPaid'],
  '/expense/approval': ['approveReimbursement', 'rejectReimbursement', 'markReimbursementPaid'],
  '/my/payroll': ['submitMyPayroll', 'getMyPayrollSlip', 'exportMyPayrollCsv', 'exportMyPayrollPdf'],
  '/admin/users': ['assignRoleToUser'],
  '/admin/roles': ['assignPermissionToRole'],
};

const supportsCrudModeSplit = (pathname: string) => splitCrudPaths.has(getCrudRouteBase(pathname));

const getFormStateByMode = (pathname: string, mode: CrudMode) => {
  const basePath = getCrudRouteBase(pathname);

  if (!supportsCrudModeSplit(basePath)) {
    return getDefaultFormState(basePath);
  }

  if (mode === 'manage') {
    return getDefaultFormState(basePath);
  }

  switch (basePath) {
    case '/profiles':
      return { phone: '', address: '', city: '', province: '', postal_code: '' };
    case '/leave/requests':
      return { leave_type: '', start_date: '', end_date: '', total_days: '', reason: '' };
    case '/leave/type':
      return { name: '', code: '', description: '', is_paid: 'true', is_active: 'true' };
    case '/leave/policy':
      return { name: '', policy_code: '', year: new Date().getFullYear().toString(), annual_allowance: '12', carry_over_allowance: '0', max_carryover_days: '5', entitlement_type: 'fixed', entitlement_value: '12', is_paid: 'true', active: 'true' };
    case '/reimbursements':
      return { title: '', description: '', amount: '', category: '', expense_date: '', receipt_path: '' };
    default:
      return getDefaultFormState(basePath);
  }
};

const actionRequiredFields: Record<string, string[]> = {
  getProfileDetail: ['id'],
  updateProfile: ['id'],
  deleteProfile: ['id'],
  startOnboarding: ['id'],
  completeOnboarding: ['id'],
  startOffboarding: ['id'],
  completeOffboarding: ['id'],
  approveLeave: ['id'],
  rejectLeave: ['id'],
  updateLeavePolicy: ['id'],
  deleteLeavePolicy: ['id'],
  updateLeaveType: ['id'],
  deleteLeaveType: ['id'],
  createLeaveType: ['name', 'code'],
  createLeavePolicy: ['name', 'policy_code', 'year'],
  submitMyReimbursement: ['id'],
  createReimbursementAdmin: ['employee_id', 'title', 'amount', 'category', 'expense_date'],
  approveReimbursement: ['id'],
  rejectReimbursement: ['id'],
  markReimbursementPaid: ['id'],
  assignAsset: ['id', 'employee_id'],
  returnAsset: ['assignment_id'],
  reviewDocument: ['id', 'status'],
  enrollTrainingProgram: ['id', 'employee_ids'],
  completeTrainingEnrollment: ['id'],
  assignCompetency: ['id', 'employee_ids'],
  createApprovalFlow: ['name', 'module', 'role_ids'],
  createPerformanceCycle: ['name', 'period_type', 'year', 'start_date', 'end_date'],
  createPerformanceReview: ['review_cycle_id', 'employee_id', 'reviewer_user_id'],
  createPerformanceOkr: ['employee_id', 'period_id', 'objective', 'start_date', 'end_date'],
  createPerformance360Review: ['cycle_id', 'employee_id', 'manager_id', 'start_date', 'end_date'],
  createPerformanceCalibration: ['cycle_id', 'name', 'scheduled_at'],
  createCareerIdp: ['employee_id', 'review_cycle_id', 'goal_title', 'target_date'],
  createCareerSuccession: ['position_key', 'employee_id', 'readiness'],
  createEngagementSurvey: ['title', 'survey_type', 'start_date', 'end_date', 'questions_json'],
  createWorkforceHolidayCalendar: ['name', 'year', 'dates_json'],
  createWorkforceShiftSwap: ['requester_employee_id', 'target_employee_id', 'swap_date'],
  updateWorkforceShiftSwap: ['id', 'status'],
  createWorkforceOvertimeRule: ['name', 'department', 'location_id', 'min_minutes', 'multiplier'],
  submitKpi: ['id'],
  approvePayroll: ['id'],
  markPayrollPaid: ['id'],
  getMyPayrollSlip: ['id'],
  assignRoleToUser: ['id', 'role_ids'],
  assignPermissionToRole: ['id', 'permission_ids'],
  markNotificationRead: ['id'],
  updateLeaveRequest: ['id'],
  cancelLeaveRequest: ['id'],
  exportMyPayrollCsv: ['id'],
  exportMyPayrollPdf: ['id'],
};

const SectionPage = () => {
  const location = useLocation();
  const path = location.pathname;
  const basePath = useMemo(() => getCrudRouteBase(path), [path]);
  const routeCrudMode = useMemo(() => getCrudModeFromPath(path), [path]);
  const activeCrudMode: CrudMode = routeCrudMode ?? 'manage';
  const setActiveCrudMode = (mode: CrudMode) => {
    const base = getCrudRouteBase(path);
    window.location.href = `${base}/${mode}`;
  };
  const sectionKey = useMemo(() => getSectionTableKey(path), [path]);
  const section = useMemo(() => getSectionData(path), [path]);
  const Icon = section.icon;
  const [summaryStats, setSummaryStats] = useState<SectionStat[]>([]);
  const [insightsChartData, setInsightsChartData] = useState<InsightChartData>({
    headcountByDepartment: [],
    leaveType: [],
    helpdeskStatus: [],
  });
  const [tableColumns, setTableColumns] = useState<string[]>(section.tableColumns);
  const [tableRows, setTableRows] = useState<string[][]>([]);
  const [formState, setFormState] = useState<Record<string, string>>(getFormStateByMode(path, activeCrudMode));
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [, setResponseText] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready to call API');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const validateActionRequest = (action: string) => {
    const allowedActions = routeActionMatrix[basePath] ?? [];
    if (!allowedActions.includes(action)) {
      throw new Error(`Action ${action} tidak diizinkan untuk path ${basePath}.`);
    }

    const requiredFields = actionRequiredFields[action] ?? [];
    const missingFields = requiredFields.filter((field) => {
      const value = formState[field];
      if (field === 'employee_ids' || field === 'role_ids' || field === 'permission_ids') {
        return !value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean).length;
      }

      return !value?.trim();
    });

    if (missingFields.length > 0) {
      throw new Error(`Field wajib belum diisi: ${missingFields.join(', ')}`);
    }

    if (action === 'uploadMyDocument' && !selectedDocumentFile) {
      throw new Error('Pilih file dokumen terlebih dahulu.');
    }
  };

  const loadHrSummaryStats = useCallback(async () => {
    const [employeesResult, attendanceResult, pendingLeavesResult, payrollResult] = await Promise.allSettled([
      api.get('/employees'),
      api.get('/attendance/today'),
      api.get('/leaves/pending'),
      api.get('/payroll'),
    ]);

    const employeesCount =
      employeesResult.status === 'fulfilled' ? getCountFromPayload(employeesResult.value.data) : 0;
    const presentTodayCount =
      attendanceResult.status === 'fulfilled' ? getCountFromPayload(attendanceResult.value.data) : 0;
    const pendingLeavesCount =
      pendingLeavesResult.status === 'fulfilled' ? getCountFromPayload(pendingLeavesResult.value.data) : 0;
    const payrollCount =
      payrollResult.status === 'fulfilled' ? getCountFromPayload(payrollResult.value.data) : 0;

    const attendanceRate = employeesCount > 0 ? Math.round((presentTodayCount / employeesCount) * 100) : 0;

    setSummaryStats([
      {
        label: 'Total Employees',
        value: String(employeesCount),
        description: 'Data karyawan aktif',
        variant: 'info',
      },
      {
        label: 'Present Today',
        value: String(presentTodayCount),
        description: `${attendanceRate}% attendance`,
        variant: 'success',
      },
      {
        label: 'Pending Leaves',
        value: String(pendingLeavesCount),
        description: 'Menunggu approval',
        variant: 'warning',
      },
      {
        label: 'Payroll Records',
        value: String(payrollCount),
        description: 'Data payroll tersedia',
        variant: 'default',
      },
    ]);
  }, []);

  useEffect(() => {
    setSummaryStats([]);
    setInsightsChartData({ headcountByDepartment: [], leaveType: [], helpdeskStatus: [] });
    setFormState(getFormStateByMode(path, activeCrudMode));
    setSelectedDocumentFile(null);
    setResponseText('');
    setStatusMessage('Ready to call API');
    setTableColumns(section.tableColumns);
    setTableRows([]);
    if (path === '/hr-summary') {
      void loadHrSummaryStats();
    }
    if (supportsList(path)) {
      void loadList(1);
    }
  }, [path, activeCrudMode, section.tableColumns, loadHrSummaryStats]);

  const canRefresh = path === '/hr-summary' || supportsList(path);

  const handleRefresh = () => {
    if (path === '/hr-summary') {
      void loadHrSummaryStats();
      return;
    }

    if (supportsList(path)) {
      void loadList(currentPage);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (file: File | null) => {
    setSelectedDocumentFile(file);
    setFormState((prev) => ({ ...prev, file: file?.name ?? '' }));
  };

  const getRequiredProfileId = () => {
    const id = formState.id?.trim();
    if (!id) {
      throw new Error('Profile ID wajib diisi untuk operasi detail, update, atau delete.');
    }
    return id;
  };

  const getRequiredId = (label: string, field: string = 'id') => {
    const value = formState[field]?.trim();
    if (!value) {
      throw new Error(`${label} wajib diisi.`);
    }

    return value;
  };

  const buildPayloadByKeys = (keys: string[]) => {
    const payload: Record<string, string> = {};

    keys.forEach((key) => {
      const value = formState[key];
      if (typeof value === 'string' && value !== '') {
        payload[key] = value;
      }
    });

    return payload;
  };

  const buildProfilePayload = () => {
    const { id: _id, ...payload } = formState;
    return payload;
  };

  const formatResponse = (payload: unknown) => {
    setResponseText(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
  };

  const loadList = async (page: number = 1) => {
    setLoading(true);
    setSummaryStats([]);
    setStatusMessage('Memuat data...');
    setCurrentPage(page);

    try {
      let result;
      const params = { page, per_page: 15 };
      
      switch (basePath) {
        case '/profiles':
          result = await api.get('/profiles', { params });
          break;
        case '/my/profile':
          result = await api.get('/my/profile');
          break;
        case '/employees':
          result = await api.get('/employees', { params });
          break;
        case '/leave/requests':
          result = await api.get('/leaves', { params });
          break;
        case '/leave/my-leave':
          result = await api.get('/leaves/my', { params });
          break;
        case '/leave/type':
          result = await api.get('/leave-types', { params });
          break;
        case '/leave/policy':
          result = await api.get('/leave-policies', { params });
          break;
        case '/attendance':
        case '/attendance/daily':
          result = await api.get('/attendance/all', { params });
          break;
        case '/attendance/timesheet':
          result = await api.get('/attendance/history', { params });
          break;
        case '/attendance/shifts':
          result = await api.get('/work-schedules', { params });
          break;
        case '/attendance/overtime':
          result = await api.get('/attendance/overtime', { params: { ...params, days: 30 } });
          break;
        case '/attendance/reports':
          result = await api.get('/attendance/intelligence', { params: { ...params, days: 30 } });
          break;
        case '/attendance/history':
          result = await api.get('/attendance/history', { params });
          break;
        case '/leave/balance':
          result = await api.get('/leaves/balance');
          break;
        case '/leave/my-leave':
          result = await api.get('/leaves/my');
          break;
        case '/attendance/today':
          result = await api.get('/attendance/today', { params });
          break;
        case '/payroll':
        case '/payroll/list':
        case '/payroll/crud':
        case '/payroll/tax':
        case '/payroll/reports':
          result = await api.get('/payroll', { params });
          break;
        case '/admin/audit-logs':
          result = await api.get('/audit-logs');
          break;
        case '/admin/import':
          result = await api.get('/admin/import/template', { params: { type: 'employee' } });
          break;
        case '/admin/email-notifications':
          result = await api.get('/notifications', { params: { type: 'email' } });
          break;
        case '/reimbursements':
        case '/expense/submit':
        case '/expense/list':
          result = await api.get('/reimbursements');
          break;
        case '/expense/approval':
          result = await api.get('/reimbursements', { params: { status: 'submitted' } });
          break;
        case '/expense/categories':
        case '/expense/reports':
          result = await api.get('/reimbursements/statistics');
          break;
        case '/my/reimbursements':
          result = await api.get('/my/reimbursements');
          break;
        case '/assets':
          result = await api.get('/assets');
          if (result && result.data && result.data.data) {
            // Cek jika data paginasi (ada .data di dalam .data)
            const paged = result.data.data;
            const assets = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(assets);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(assets.length === 0 ? 'Belum ada aset.' : 'Data aset berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/assets/assignments':
          result = await api.get('/assets');
          break;
        case '/my/assets':
          result = await api.get('/my/assets');
          if (result && result.data && Array.isArray(result.data.data)) {
            const assets = result.data.data;
            formatResponse(assets);
            const parsed = parsePayloadToTable(assets);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(assets.length === 0 ? 'Belum ada aset.' : 'Data aset berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/my/documents':
          result = await api.get('/my/documents');
          if (result && result.data && result.data.data) {
            // Cek jika data paginasi (ada .data di dalam .data)
            const paged = result.data.data;
            const docs = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(docs);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(docs.length === 0 ? 'Belum ada dokumen.' : 'Data dokumen berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/documents/review':
          result = await api.get('/documents', { params: { status: 'pending', per_page: 15 } });
          if (result && result.data && result.data.data) {
            // Cek jika data paginasi (ada .data di dalam .data)
            const paged = result.data.data;
            const docs = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(docs);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(docs.length === 0 ? 'Belum ada dokumen.' : 'Data dokumen berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/documents/expiring':
          result = await api.get('/documents/expiring', { params: { days: 30 } });
          break;
        case '/organization/directory':
          result = await api.get('/organization/directory');
          // Ambil langsung array employee dari response
          if (result && result.data && result.data.data && Array.isArray(result.data.data.data)) {
            const payload = result.data.data.data;
            formatResponse(payload);
            const parsed = parsePayloadToTable(payload);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage('Data berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/organization/summary':
          result = await api.get('/organization/summary');
          if (result && result.data && result.data.data) {
            const payload = result.data.data;
            // Tampilkan summary utama sebagai statistik
            if (payload.summary) {
              setSummaryStats([
                { label: 'Total Employees', value: String(payload.summary.total_employees), description: '', variant: 'info' },
                { label: 'Active', value: String(payload.summary.active_employees), description: '', variant: 'success' },
                { label: 'Inactive', value: String(payload.summary.inactive_employees), description: '', variant: 'default' },
                { label: 'Onboarding', value: String(payload.summary.onboarding_employees), description: '', variant: 'info' },
                { label: 'Probation', value: String(payload.summary.probation_employees), description: '', variant: 'warning' },
                { label: 'Offboarding', value: String(payload.summary.offboarding_employees), description: '', variant: 'warning' },
                { label: 'Terminated', value: String(payload.summary.terminated_employees), description: '', variant: 'danger' },
              ]);
            }
            // Tampilkan by_department sebagai tabel utama
            if (Array.isArray(payload.by_department)) {
              const parsed = parsePayloadToTable(payload.by_department);
              setTableColumns(parsed.columns);
              setTableRows(parsed.rows as string[][]);
            } else {
              setTableColumns([]);
              setTableRows([]);
            }
            setStatusMessage('Data summary berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/organization/chart':
          result = await api.get('/organization/chart');
          if (result && result.data && result.data.data && Array.isArray(result.data.data.nodes)) {
            const payload = result.data.data.nodes;
            formatResponse(payload);
            const parsed = parsePayloadToTable(payload);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage('Data struktur organisasi berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/organization/team':
          result = await api.get(`/organization/team/${formState.manager_user_id || '1'}`);
          break;
        case '/organization/master-data':
          result = await api.get('/organization/master-data');
          if (result && result.data && result.data.data) {
            const payload = result.data.data;
            // Gabungkan semua kategori ke satu tabel rapi
            const departments = Array.isArray(payload.departments) ? payload.departments : [];
            const positions = Array.isArray(payload.positions) ? payload.positions : [];
            const statuses = Array.isArray(payload.statuses) ? payload.statuses : [];
            const locations = Array.isArray(payload.locations) ? payload.locations : [];
            const workSchedules = Array.isArray(payload.work_schedules) ? payload.work_schedules : [];

            // Cari panjang maksimum
            const maxLength = Math.max(
              departments.length,
              positions.length,
              statuses.length,
              locations.length,
              workSchedules.length
            );

            // Helper to get string representation from possibly complex objects
            const getStringVal = (val: any) => {
              if (!val) return '';
              if (typeof val === 'string' || typeof val === 'number') return String(val);
              return val.name || val.label || val.title || JSON.stringify(val);
            };

            // Buat baris-baris tabel, setiap baris berisi satu data dari tiap kategori (atau kosong jika tidak ada)
            const rows: string[][] = [];
            for (let i = 0; i < maxLength; i++) {
              rows.push([
                getStringVal(departments[i]),
                getStringVal(positions[i]),
                getStringVal(statuses[i]),
                getStringVal(locations[i]),
                getStringVal(workSchedules[i]),
              ]);
            }

            setTableColumns([
              'Department',
              'Position',
              'Status',
              'Location',
              'Work Schedule',
            ]);
            setTableRows(rows);
            formatResponse(payload);
            setStatusMessage('Data master berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/approval-flows':
          result = await api.get('/approval-flows');
          break;
        case '/compliance/overview':
          result = await api.get('/compliance/overview');
          break;
        case '/compliance/audit-summary':
          result = await api.get('/compliance/audit-summary');
          break;
        case '/compliance/expiring-documents':
          result = await api.get('/compliance/expiring-documents', {
            params: { days: formState.days || 30 },
          });
          break;
        case '/training/programs':
          result = await api.get('/training/programs');
          if (result && result.data && result.data.data) {
            // Cek jika data paginasi (ada .data di dalam .data)
            const paged = result.data.data;
            const programs = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(programs);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(programs.length === 0 ? 'Belum ada program pelatihan.' : 'Data program pelatihan berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/training/enrollments':
          result = await api.get('/training/programs');
          break;
        case '/my/trainings':
          result = await api.get('/my/trainings');
          break;
        case '/competencies':
          result = await api.get('/competencies');
          if (result && result.data && result.data.data) {
            // Cek jika data paginasi (ada .data di dalam .data)
            const paged = result.data.data;
            const competencies = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(competencies);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(competencies.length === 0 ? 'Belum ada kompetensi.' : 'Data kompetensi berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/my/competencies':
          result = await api.get('/my/competencies');
          break;
        case '/notifications':
          result = await api.get('/notifications');
          break;
        case '/insights/people/detailed':
        case '/reports/custom':
          result = await api.get('/insights/people/detailed', { params: { window_days: 30, expiring_days: 30 } });
          if (result && result.data && result.data.data) {
            const payload = result.data.data;
            formatResponse(payload);
            // Kumpulkan statistik utama saja, tanpa tabel object-object
            const stats: SectionStat[] = [];
            if (payload.headcount) {
              stats.push({ label: 'Total Employees', value: String(payload.headcount.total ?? 0), description: '', variant: 'info' });
            }
            if (payload.payroll) {
              stats.push({ label: 'Payroll Records', value: String(payload.payroll.records_count ?? 0), description: '', variant: 'default' });
              stats.push({ label: 'Total Take Home Pay', value: `Rp ${Number(payload.payroll.total_take_home_pay ?? 0).toLocaleString('id-ID')}`, description: '', variant: 'success' });
              stats.push({ label: 'Total Deduction', value: `Rp ${Number(payload.payroll.total_deduction ?? 0).toLocaleString('id-ID')}`, description: '', variant: 'danger' });
            }
            if (payload.reimbursement) {
              stats.push({ label: 'Reimbursements', value: String(payload.reimbursement.records_count ?? 0), description: '', variant: 'default' });
              stats.push({ label: 'Pending Reimbursements', value: String(payload.reimbursement.pending_count ?? 0), description: '', variant: 'warning' });
              stats.push({ label: 'Total Reimburse Amount', value: `Rp ${Number(payload.reimbursement.total_amount ?? 0).toLocaleString('id-ID')}`, description: '', variant: 'success' });
              stats.push({ label: 'Pending Amount', value: `Rp ${Number(payload.reimbursement.pending_amount ?? 0).toLocaleString('id-ID')}`, description: '', variant: 'warning' });
            }
            if (payload.leave) {
              stats.push({ label: 'Leave Pending', value: String(payload.leave.by_status?.pending ?? 0), description: '', variant: 'warning' });
              stats.push({ label: 'Leave Approved', value: String(payload.leave.by_status?.approved ?? 0), description: '', variant: 'success' });
              stats.push({ label: 'Leave Rejected', value: String(payload.leave.by_status?.rejected ?? 0), description: '', variant: 'danger' });
            }
            if (payload.attendance) {
              stats.push({ label: 'Attendance Records', value: String(payload.attendance.total_records ?? 0), description: '', variant: 'default' });
              stats.push({ label: 'Late Count', value: String(payload.attendance.late_count ?? 0), description: '', variant: 'warning' });
              stats.push({ label: 'Absent Count', value: String(payload.attendance.absent_count ?? 0), description: '', variant: 'danger' });
              stats.push({ label: 'Overtime Minutes', value: String(payload.attendance.overtime_minutes ?? 0), description: '', variant: 'info' });
              if (payload.attendance.overtime_hours !== undefined) {
                stats.push({ label: 'Overtime Hours', value: String(payload.attendance.overtime_hours), description: '', variant: 'info' });
              }
            }
            if (payload.training) {
              stats.push({ label: 'Training Enrollments', value: String(payload.training.enrollment_count ?? 0), description: '', variant: 'default' });
              stats.push({ label: 'Training Completed', value: String(payload.training.completed_count ?? 0), description: '', variant: 'success' });
              stats.push({ label: 'Completion Rate (%)', value: String(payload.training.completion_rate_percent ?? 0), description: '', variant: 'info' });
            }
            if (payload.helpdesk) {
              stats.push({ label: 'Helpdesk Tickets', value: String(payload.helpdesk.ticket_count ?? 0), description: '', variant: 'default' });
              stats.push({ label: 'Open Tickets', value: String(payload.helpdesk.open_ticket_count ?? 0), description: '', variant: 'warning' });
              stats.push({ label: 'Avg Resolution (hrs)', value: String(payload.helpdesk.avg_resolution_hours ?? 0), description: '', variant: 'info' });
            }
            if (payload.documents) {
              stats.push({ label: 'Total Documents', value: String(payload.documents.total_documents ?? 0), description: '', variant: 'default' });
              stats.push({ label: 'Expiring Soon', value: String(payload.documents.expiring_soon_count ?? 0), description: '', variant: 'warning' });
            }
            setSummaryStats(stats);
            setTableColumns([]);
            setTableRows([]);
            setStatusMessage('Data insight berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/performance/summary':
          result = await api.get('/performance/summary');
          if (result && result.data && result.data.data) {
            const paged = result.data.data;
            const rows = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(rows);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(rows.length === 0 ? 'Belum ada ringkasan performa.' : 'Data ringkasan performa berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/performance/cycles':
          result = await api.get('/performance/cycles');
          if (result && result.data && result.data.data) {
            const paged = result.data.data;
            const rows = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(rows);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(rows.length === 0 ? 'Belum ada siklus performa.' : 'Data siklus performa berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/performance/reviews':
          result = await api.get('/performance/reviews');
          if (result && result.data && result.data.data) {
            const paged = result.data.data;
            const rows = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(rows);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(rows.length === 0 ? 'Belum ada review performa.' : 'Data review performa berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/career/idps':
          result = await api.get('/career/idps');
          if (result && result.data && result.data.data) {
            const paged = result.data.data;
            const rows = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(rows);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(rows.length === 0 ? 'Belum ada IDP.' : 'Data IDP berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/career/succession':
          result = await api.get('/career/succession');
          if (result && result.data && result.data.data) {
            const paged = result.data.data;
            const rows = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(rows);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(rows.length === 0 ? 'Belum ada succession plan.' : 'Data succession plan berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/engagement/surveys':
          result = await api.get('/engagement/surveys');
          if (result && result.data && result.data.data) {
            const paged = result.data.data;
            const rows = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(rows);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(rows.length === 0 ? 'Belum ada survei engagement.' : 'Data survei engagement berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/workforce/holidays':
          result = await api.get('/workforce/holidays');
          if (result && result.data && result.data.data) {
            const paged = result.data.data;
            const rows = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(rows);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(rows.length === 0 ? 'Belum ada hari libur.' : 'Data hari libur berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/workforce/shift-swaps':
          result = await api.get('/workforce/shift-swaps');
          if (result && result.data && result.data.data) {
            const paged = result.data.data;
            const rows = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(rows);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(rows.length === 0 ? 'Belum ada shift swap.' : 'Data shift swap berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/workforce/overtime-rules':
          result = await api.get('/workforce/overtime-rules');
          if (result && result.data && result.data.data) {
            const paged = result.data.data;
            const rows = Array.isArray(paged.data) ? paged.data : [];
            formatResponse(paged);
            const parsed = parsePayloadToTable(rows);
            setTableColumns(parsed.columns);
            setTableRows(parsed.rows as string[][]);
            setStatusMessage(rows.length === 0 ? 'Belum ada aturan lembur.' : 'Data aturan lembur berhasil dimuat.');
            setLoading(false);
            return;
          }
          break;
        case '/reports/dashboard-summary':
          result = await api.get('/reports/dashboard-summary');
          break;
        case '/reports/attendance':
          result = await api.get('/reports/attendance', {
            params: {
              start_date: formState.start_date || undefined,
              end_date: formState.end_date || undefined,
            },
          });
          break;
        case '/reports/competency':
          result = await api.get('/reports/competency');
          break;
        case '/reports/employee-lifecycle':
          result = await api.get('/reports/employee-lifecycle', {
            params: {
              year: formState.year || undefined,
            },
          });
          break;
        case '/reports/assets':
          result = await api.get('/reports/assets');
          break;
        case '/reports/leave':
          result = await api.get('/reports/leave', {
            params: {
              year: formState.year || undefined,
            },
          });
          break;
        case '/reports/payroll':
          result = await api.get('/reports/payroll', {
            params: {
              start_date: formState.start_date || undefined,
              end_date: formState.end_date || undefined,
            },
          });
          break;
        case '/reports/custom':
          result = await api.get('/insights/people/detailed', {
            params: {
              window_days: formState.window_days || 30,
              expiring_days: formState.expiring_days || 30,
            },
          });
          break;
        case '/settings/company':
          result = await api.get('/locations');
          break;
        case '/settings/user-role':
          result = await api.get('/admin/users');
          break;
        case '/settings/permissions':
          result = await api.get('/admin/permissions');
          break;
        case '/settings/master-data/department':
        case '/settings/master-data/position':
          result = await api.get('/employees');
          break;
        case '/settings/master-data/leave-type':
          result = await api.get('/leave-policies');
          break;
        case '/settings/notification':
        case '/settings/logs':
          result = await api.get('/notifications');
          break;
        case '/locations':
          result = await api.get('/locations');
          break;
        case '/admin/users':
          result = await api.get('/admin/users');
          break;
        case '/admin/roles':
          result = await api.get('/admin/roles');
          break;
        case '/admin/permissions':
          result = await api.get('/admin/permissions');
          break;
        case '/my/kpi':
          result = await api.get('/my/kpi');
          break;
        case '/my/payroll':
          result = await api.get('/my/payroll');
          break;
        default:
          result = null;
      }

      if (result) {
        let payload = result.data?.data ?? result.data;
        let actualPayload = payload;

        // Laravel style pagination handling
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          const paginatedPayload = payload as Record<string, unknown>;
          const pageItems = paginatedPayload.data;
          if (Array.isArray(pageItems)) {
            actualPayload = pageItems;
            setTotalPages(toFiniteNumber(paginatedPayload.last_page, 1));
            setTotalItems(toFiniteNumber(paginatedPayload.total, pageItems.length));
            setCurrentPage(toFiniteNumber(paginatedPayload.current_page, page));
          }
        } else if (Array.isArray(payload)) {
          setTotalPages(1);
          setTotalItems(payload.length);
          setCurrentPage(1);
        }

        if (basePath === '/reports/dashboard-summary' && payload && typeof payload === 'object') {
          const reportPayload = payload as any;
          const stats: SectionStat[] = [];

          if (reportPayload.headcount) {
            stats.push({ label: 'Total Employees', value: String(reportPayload.headcount.total ?? 0), description: '', variant: 'info' });
            stats.push({ label: 'Active Employees', value: String(reportPayload.headcount.active ?? 0), description: '', variant: 'success' });
            stats.push({ label: 'Inactive Employees', value: String(reportPayload.headcount.inactive ?? 0), description: '', variant: 'default' });
          }
          if (reportPayload.attendance) {
            stats.push({ label: 'Present', value: String(reportPayload.attendance.present ?? 0), description: '', variant: 'success' });
            stats.push({ label: 'Absent', value: String(reportPayload.attendance.absent ?? 0), description: '', variant: 'danger' });
            stats.push({ label: 'Late', value: String(reportPayload.attendance.late ?? 0), description: '', variant: 'warning' });
            stats.push({ label: 'Permission', value: String(reportPayload.attendance.permission ?? 0), description: '', variant: 'info' });
          }
          if (reportPayload.leave) {
            stats.push({ label: 'Leave Approved', value: String(reportPayload.leave.approved ?? 0), description: '', variant: 'success' });
            stats.push({ label: 'Leave Pending', value: String(reportPayload.leave.pending ?? 0), description: '', variant: 'warning' });
            stats.push({ label: 'Leave Rejected', value: String(reportPayload.leave.rejected ?? 0), description: '', variant: 'danger' });
          }
          if (reportPayload.payroll) {
            stats.push({ label: 'Payroll Total', value: String(reportPayload.payroll.total_amount ?? 0), description: '', variant: 'default' });
            stats.push({ label: 'Payroll Approved', value: String(reportPayload.payroll.approved ?? 0), description: '', variant: 'success' });
            stats.push({ label: 'Payroll Paid', value: String(reportPayload.payroll.paid ?? 0), description: '', variant: 'success' });
            stats.push({ label: 'Payroll Pending', value: String(reportPayload.payroll.pending ?? 0), description: '', variant: 'warning' });
          }
          if (reportPayload.training) {
            stats.push({ label: 'Training Total', value: String(reportPayload.training.total_programs ?? 0), description: '', variant: 'info' });
            stats.push({ label: 'Training Active', value: String(reportPayload.training.active ?? 0), description: '', variant: 'success' });
            stats.push({ label: 'Training Completed', value: String(reportPayload.training.completed ?? 0), description: '', variant: 'default' });
          }
          if (reportPayload.assets) {
            stats.push({ label: 'Assets Total', value: String(reportPayload.assets.total ?? 0), description: '', variant: 'info' });
            stats.push({ label: 'Assets Assigned', value: String(reportPayload.assets.assigned ?? 0), description: '', variant: 'success' });
            stats.push({ label: 'Assets Available', value: String(reportPayload.assets.available ?? 0), description: '', variant: 'default' });
          }

          setSummaryStats(stats);
          setTableColumns([]);
          setTableRows([]);
          setStatusMessage('Data dashboard summary berhasil dimuat.');
          formatResponse(payload);
          setLoading(false);
          return;
        }

        if (basePath === '/reports/attendance' && payload && typeof payload === 'object') {
          const reportPayload = payload as any;
          const summary = reportPayload.summary ?? {};
          const stats: SectionStat[] = [
            { label: 'Working Days', value: String(summary.total_working_days ?? 0), description: '', variant: 'info' },
            { label: 'Present', value: String(summary.present_count ?? 0), description: '', variant: 'success' },
            { label: 'Absent', value: String(summary.absent_count ?? 0), description: '', variant: 'danger' },
            { label: 'Late', value: String(summary.late_count ?? 0), description: '', variant: 'warning' },
            { label: 'Permission', value: String(summary.permission_count ?? 0), description: '', variant: 'default' },
            { label: 'Attendance Rate', value: String(summary.attendance_rate ?? 0), description: '%', variant: 'success' },
          ];
          setSummaryStats(stats);
          const rows = Array.isArray(reportPayload.by_employee) ? reportPayload.by_employee : [];
          const parsed = parsePayloadToTable(rows);
          setTableColumns(parsed.columns);
          setTableRows(parsed.rows as string[][]);
          setStatusMessage(rows.length === 0 ? 'Tidak ada data karyawan untuk laporan kehadiran.' : 'Data laporan kehadiran berhasil dimuat.');
          formatResponse(payload);
          setLoading(false);
          return;
        }

        if (basePath === '/reports/leave' && payload && typeof payload === 'object') {
          const reportPayload = payload as any;
          const summary = reportPayload.summary ?? {};
          const stats: SectionStat[] = [
            { label: 'Total Leaves Taken', value: String(summary.total_leaves_taken ?? 0), description: '', variant: 'info' },
            { label: 'Total Days Used', value: String(summary.total_days_used ?? 0), description: '', variant: 'success' },
            { label: 'Pending Leaves', value: String(reportPayload.pending ?? 0), description: '', variant: 'warning' },
          ];
          setSummaryStats(stats);
          const rows = Array.isArray(reportPayload.by_employee) ? reportPayload.by_employee : [];
          const parsed = parsePayloadToTable(rows);
          setTableColumns(parsed.columns);
          setTableRows(parsed.rows as string[][]);
          setStatusMessage(rows.length === 0 ? 'Tidak ada data karyawan untuk laporan cuti.' : 'Data laporan cuti berhasil dimuat.');
          formatResponse(payload);
          setLoading(false);
          return;
        }

        if (basePath === '/reports/payroll' && payload && typeof payload === 'object') {
          const reportPayload = payload as any;
          const summary = reportPayload.summary ?? {};
          const stats: SectionStat[] = [
            { label: 'Payroll Count', value: String(summary.total_payroll_count ?? 0), description: '', variant: 'info' },
            { label: 'Total Salary', value: String(summary.total_salary ?? 0), description: '', variant: 'success' },
            { label: 'Total Allowance', value: String(summary.total_allowance ?? 0), description: '', variant: 'default' },
            { label: 'Total Deduction', value: String(summary.total_deduction ?? 0), description: '', variant: 'danger' },
            { label: 'Total Bonus', value: String(summary.total_bonus ?? 0), description: '', variant: 'success' },
            { label: 'Total Net Pay', value: String(summary.total_net_pay ?? 0), description: '', variant: 'success' },
            { label: 'Average Salary', value: String(summary.average_salary ?? 0), description: '', variant: 'info' },
          ];
          setSummaryStats(stats);
          const rows = Array.isArray(reportPayload.by_status) ? reportPayload.by_status : [];
          const parsed = parsePayloadToTable(rows);
          setTableColumns(parsed.columns);
          setTableRows(parsed.rows as string[][]);
          setStatusMessage(rows.length === 0 ? 'Tidak ada status payroll untuk laporan payroll.' : 'Data laporan payroll berhasil dimuat.');
          formatResponse(payload);
          setLoading(false);
          return;
        }

        formatResponse(payload);
        const parsed = parsePayloadToTable(actualPayload);
        setTableColumns(parsed.columns);
        setTableRows(parsed.rows as string[][]);
        setStatusMessage('Data berhasil dimuat.');
      } else {
        setStatusMessage('Tidak ada data untuk path ini.');
        setTableColumns(section.tableColumns);
        setTableRows([]);
        formatResponse('No list endpoint configured.');
      }
    } catch (error: any) {
      setStatusMessage('Gagal memuat data.');
      formatResponse(error.response?.data ?? error.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string) => {
    setLoading(true);
    setResponseText('');
    setStatusMessage('Mengirim request...');

    try {
      validateActionRequest(action);
      const actionExecutor = createSectionActionExecutor({
        path: basePath,
        formState,
        selectedDocumentFile,
        buildPayloadByKeys,
        buildProfilePayload,
        getRequiredId,
        getRequiredProfileId,
      })[action];

      if (!actionExecutor) {
        throw new Error(`Unhandled action: ${action}`);
      }

      const result = await actionExecutor();

      formatResponse(result.data);
      setStatusMessage('Request berhasil.');
      if (supportsList(path)) {
        void loadList();
      }
    } catch (error: any) {
      setStatusMessage('Request gagal.');
      formatResponse(error.response?.data ?? error.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    const entries = Object.entries(formState);
    if (entries.length === 0) {
      return <p className="action-note">Tidak ada form untuk operasi ini. Gunakan tombol aksi di bawah.</p>;
    }

    return (
      <div className="action-form-grid">
        {entries.map(([key, value]) => (
          <label key={key} className="action-form-group">
            <span>{key.replace(/_/g, ' ').toUpperCase()}</span>
            {key === 'file' ? (
              <>
                <input
                  type="file"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFileChange(e.target.files?.[0] ?? null)}
                  className="action-input"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
                {selectedDocumentFile ? <small>Selected: {selectedDocumentFile.name}</small> : null}
              </>
            ) : selectOptionsByField[key] ? (
              <select
                value={value}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFieldChange(key, e.target.value)}
                className="action-input"
              >
                <option value="">Select {key}</option>
                {selectOptionsByField[key].map((option) => (
                  <option key={`${key}-${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : textareaFields.has(key) ? (
              <textarea
                value={value}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleFieldChange(key, e.target.value)}
                placeholder={key}
                className="action-input"
                rows={3}
              />
            ) : (
              <input
                type={dateFields.has(key) ? 'date' : numberFields.has(key) ? 'number' : 'text'}
                value={value}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldChange(key, e.target.value)}
                placeholder={key}
                className="action-input"
                step={numberFields.has(key) ? 'any' : undefined}
              />
            )}
          </label>
        ))}
      </div>
    );
  };

  const renderActionButtons = () => {
    const isCreateMode = activeCrudMode === 'create';

    switch (basePath) {
      case '/profiles':
        return (
          <>
            {isCreateMode ? (
              <Button variant="primary" size="md" onClick={() => void performAction('createProfile')} disabled={loading}>
                <Plus size={16} /> Create Profile
              </Button>
            ) : (
              <>
                <Button variant="outline" size="md" onClick={() => void performAction('getProfileDetail')} disabled={loading}>
                  <Eye size={16} /> Get Profile Detail
                </Button>
                <Button variant="secondary" size="md" onClick={() => void performAction('updateProfile')} disabled={loading}>
                  <Save size={16} /> Update Profile
                </Button>
                <Button variant="outline" size="md" onClick={() => void performAction('deleteProfile')} disabled={loading}>
                  <Trash2 size={16} /> Delete Profile
                </Button>
              </>
            )}
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={16} /> Refresh Profiles
            </Button>
          </>
        );
      case '/employees/add':
        return (
          <Button variant="primary" size="md" onClick={() => void performAction('createEmployee')} disabled={loading}>
            Create Employee
          </Button>
        );
      case '/employees':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('startOnboarding')} disabled={loading}>
              <Plus size={16} /> Start Onboarding
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('completeOnboarding')} disabled={loading}>
              <CheckCircle size={16} /> Complete Onboarding
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('startOffboarding')} disabled={loading}>
              <XCircle size={16} /> Start Offboarding
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('completeOffboarding')} disabled={loading}>
              <CheckCircle size={16} /> Complete Offboarding
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={16} /> Refresh Employees
            </Button>
          </>
        );
      case '/leave/requests':
        return (
          <>
            {isCreateMode ? (
              <Button variant="primary" size="md" onClick={() => void performAction('createLeave')} disabled={loading}>
                Submit Leave Request
              </Button>
            ) : (
              <>
                <Button variant="outline" size="md" onClick={() => void performAction('updateLeaveRequest')} disabled={loading}>
                  Update Leave Request
                </Button>
                <Button variant="outline" size="md" onClick={() => void performAction('cancelLeaveRequest')} disabled={loading}>
                  Cancel Leave Request
                </Button>
              </>
            )}
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Refresh Leave Data
            </Button>
          </>
        );
      case '/leave/type':
        return (
          <>
            {isCreateMode ? (
              <Button variant="primary" size="md" onClick={() => void performAction('createLeaveType')} disabled={loading}>
                <Plus size={16} /> Tambah Jenis Cuti
              </Button>
            ) : (
              <>
                <Button variant="outline" size="md" onClick={() => void performAction('updateLeaveType')} disabled={loading}>
                  <Save size={16} /> Update Jenis
                </Button>
                <Button variant="outline" size="md" onClick={() => void performAction('deleteLeaveType')} disabled={loading}>
                  <Trash2 size={16} /> Hapus Jenis
                </Button>
              </>
            )}
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={16} /> Segarkan
            </Button>
          </>
        );
      case '/leave/policy':
        return (
          <>
            {isCreateMode ? (
              <Button variant="primary" size="md" onClick={() => void performAction('createLeavePolicy')} disabled={loading}>
                <Plus size={16} /> Buat Kebijakan
              </Button>
            ) : (
              <>
                <Button variant="outline" size="md" onClick={() => void performAction('updateLeavePolicy')} disabled={loading}>
                  <Save size={16} /> Update Kebijakan
                </Button>
                <Button variant="outline" size="md" onClick={() => void performAction('deleteLeavePolicy')} disabled={loading}>
                  <Trash2 size={16} /> Hapus Kebijakan
                </Button>
              </>
            )}
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={16} /> Segarkan
            </Button>
          </>
        );
      case '/attendance/check-in':
        return (
          <Button variant="primary" size="md" onClick={() => void performAction('checkIn')} disabled={loading}>
            Check In
          </Button>
        );
      case '/attendance/check-out':
        return (
          <Button variant="primary" size="md" onClick={() => void performAction('checkOut')} disabled={loading}>
            Check Out
          </Button>
        );
      case '/my/reimbursements':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createReimbursement')} disabled={loading}>
              Submit Reimbursement
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('submitMyReimbursement')} disabled={loading}>
              Submit Existing Draft
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Refresh Reimbursements
            </Button>
          </>
        );
      case '/assets':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createAsset')} disabled={loading}>
              Create Asset
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Refresh Assets
            </Button>
          </>
        );
      case '/assets/assignments':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('assignAsset')} disabled={loading}>
              Assign Asset
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('returnAsset')} disabled={loading}>
              Return Asset
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Refresh Assignments
            </Button>
          </>
        );
      case '/my/documents':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('uploadMyDocument')} disabled={loading}>
              Upload Document
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Refresh Documents
            </Button>
          </>
        );
      case '/documents/review':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('reviewDocument')} disabled={loading}>
              Review Document
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Refresh Queue
            </Button>
          </>
        );
      case '/training/programs':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createTrainingProgram')} disabled={loading}>
              <Plus size={16} /> Buat Program
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={16} /> Muat Ulang Program
            </Button>
          </>
        );
      case '/training/enrollments':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('enrollTrainingProgram')} disabled={loading}>
              <UserPlus size={16} /> Daftarkan Karyawan
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('completeTrainingEnrollment')} disabled={loading}>
              <CheckCircle size={16} /> Selesaikan Pendaftaran
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={16} /> Muat Ulang Pendaftaran
            </Button>
          </>)
      case '/competencies':
      case '/my/competencies':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createCompetency')} disabled={loading}>
              Buat Kompetensi
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('assignCompetency')} disabled={loading}>
              Tugaskan Kompetensi
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Kompetensi
            </Button>
          </>
        );
      case '/approval-flows':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createApprovalFlow')} disabled={loading}>
              Buat Alur Persetujuan
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Alur Persetujuan
            </Button>
          </>
        );
      case '/performance/cycles':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createPerformanceCycle')} disabled={loading}>
              Buat Siklus
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Siklus
            </Button>
          </>
        );
      case '/performance/reviews':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createPerformanceReview')} disabled={loading}>
              Buat Review
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Review
            </Button>
          </>
        );
      case '/career/idps':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createCareerIdp')} disabled={loading}>
              Buat IDP
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang IDP
            </Button>
          </>
        );
      case '/career/succession':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createCareerSuccession')} disabled={loading}>
              Buat Kandidat Suksesi
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Matriks Suksesi
            </Button>
          </>
        );
      case '/engagement/surveys':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createEngagementSurvey')} disabled={loading}>
              Buat Survei
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Survei
            </Button>
          </>
        );
      case '/workforce/holidays':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createWorkforceHolidayCalendar')} disabled={loading}>
              Buat Kalender Libur
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Hari Libur
            </Button>
          </>
        );
      case '/workforce/shift-swaps':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createWorkforceShiftSwap')} disabled={loading}>
              Buat Tukar Shift
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('updateWorkforceShiftSwap')} disabled={loading}>
              Perbarui Status Tukar Shift
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Tukar Shift
            </Button>
          </>
        );
      case '/workforce/overtime-rules':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createWorkforceOvertimeRule')} disabled={loading}>
              Buat Aturan Lembur
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Aturan Lembur
            </Button>
          </>
        );
      case '/notifications':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('markNotificationRead')} disabled={loading}>
              Tandai Satu Sudah Dibaca
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('markAllNotificationsRead')} disabled={loading}>
              Tandai Semua Sudah Dibaca
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('getNotificationUnreadCount')} disabled={loading}>
              Hitung Notifikasi Belum Dibaca
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Notifikasi
            </Button>
          </>
        );
      case '/insights/people/detailed':
      case '/organization/directory':
      case '/organization/summary':
      case '/organization/chart':
      case '/organization/team':
      case '/organization/master-data':
      case '/compliance/overview':
      case '/compliance/audit-summary':
      case '/compliance/expiring-documents':
      case '/performance/summary':
      case '/documents/expiring':
      case '/my/profile':
      case '/my/assets':
      case '/my/trainings':
      case '/attendance/daily':
      case '/attendance/timesheet':
      case '/attendance/shifts':
      case '/attendance/overtime':
      case '/attendance/reports':
      case '/payroll/tax':
      case '/payroll/reports':
      case '/expense/submit':
      case '/expense/list':
      case '/expense/categories':
      case '/expense/reports':
      case '/settings/company':
      case '/settings/user-role':
      case '/settings/permissions':
      case '/settings/master-data/department':
      case '/settings/master-data/position':
      case '/settings/master-data/leave-type':
      case '/settings/notification':
      case '/settings/logs':
        return (
          <>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={18} style={{ marginRight: '8px' }} />
              Muat Ulang Data
            </Button>
          </>
        );
      case '/reports/attendance':
      case '/reports/leave':
      case '/reports/payroll':
      case '/reports/dashboard-summary':
      case '/reports/competency':
      case '/reports/employee-lifecycle':
      case '/reports/assets':
      case '/reports/custom':
        return (
          <>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <Search size={18} style={{ marginRight: '8px' }} />
              Terapkan Filter Laporan
            </Button>
          </>
        );
      case '/my/kpi':
        return (
          <Button variant="primary" size="md" onClick={() => void performAction('submitKpi')} disabled={!formState.id || loading}>
            <Send size={18} style={{ marginRight: '8px' }} />
            Submit KPI
          </Button>
        );
      case '/payroll':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('generatePayroll')} disabled={loading}>
              <Play size={18} style={{ marginRight: '8px' }} />
              Proses Payroll Bulanan
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('approvePayroll')} disabled={loading}>
              <CheckCircle size={18} style={{ marginRight: '8px' }} />
              Setujui Payroll
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('markPayrollPaid')} disabled={loading}>
              <Banknote size={18} style={{ marginRight: '8px' }} />
              Tandai Payroll Sudah Dibayar
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={18} style={{ marginRight: '8px' }} />
              Muat Ulang Payroll
            </Button>
          </>
        );
      case '/locations':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('createLocation')} disabled={loading}>
              <MapPin size={18} style={{ marginRight: '8px' }} />
              Tambah Lokasi
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={18} style={{ marginRight: '8px' }} />
              Muat Ulang Lokasi
            </Button>
          </>
        );
      case '/reimbursements':
        return (
          <>
            {isCreateMode ? (
                <Button variant="primary" size="md" onClick={() => void performAction('createReimbursementAdmin')} disabled={loading}>
                  <Plus size={18} style={{ marginRight: '8px' }} />
                  Buat Reimburse
              </Button>
            ) : (
              <>
                <Button variant="outline" size="md" onClick={() => void performAction('approveReimbursement')} disabled={loading}>
                  <CheckCircle size={18} style={{ marginRight: '8px' }} />
                  Setujui Reimburse
                </Button>
                <Button variant="outline" size="md" onClick={() => void performAction('rejectReimbursement')} disabled={loading}>
                  <XCircle size={18} style={{ marginRight: '8px' }} />
                  Tolak Reimburse
                </Button>
                <Button variant="outline" size="md" onClick={() => void performAction('markReimbursementPaid')} disabled={loading}>
                  <Banknote size={18} style={{ marginRight: '8px' }} />
                  Tandai Sudah Dibayar
                </Button>
              </>
            )}
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={18} style={{ marginRight: '8px' }} />
              Muat Ulang Reimburse
            </Button>
          </>
        );
      case '/expense/approval':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('approveReimbursement')} disabled={loading}>
              <CheckCircle size={18} style={{ marginRight: '8px' }} />
              Setujui Reimburse
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('rejectReimbursement')} disabled={loading}>
              <XCircle size={18} style={{ marginRight: '8px' }} />
              Tolak Reimburse
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('markReimbursementPaid')} disabled={loading}>
              <Banknote size={18} style={{ marginRight: '8px' }} />
              Tandai Sudah Dibayar
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={18} style={{ marginRight: '8px' }} />
              Muat Ulang Antrian Persetujuan
            </Button>
          </>
        );
      case '/my/payroll':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('submitMyPayroll')} disabled={loading}>
              <RefreshCcw size={18} style={{ marginRight: '8px' }} />
              Muat Ulang Payroll Saya
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('getMyPayrollSlip')} disabled={loading}>
              <Eye size={18} style={{ marginRight: '8px' }} />
              Lihat Slip Gaji
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('exportMyPayrollCsv')} disabled={loading}>
              <FileUp size={18} style={{ marginRight: '8px' }} />
              Ekspor Payroll CSV
            </Button>
            <Button variant="outline" size="md" onClick={() => void performAction('exportMyPayrollPdf')} disabled={loading}>
              <FileText size={18} style={{ marginRight: '8px' }} />
              Ekspor Payroll PDF
            </Button>
          </>
        );
      case '/admin/users':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('assignRoleToUser')} disabled={loading}>
              <UserPlus size={18} style={{ marginRight: '8px' }} />
              Tugaskan Peran ke Pengguna
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={18} style={{ marginRight: '8px' }} />
              Muat Ulang Pengguna
            </Button>
          </>
        );
      case '/admin/roles':
        return (
          <>
            <Button variant="primary" size="md" onClick={() => void performAction('assignPermissionToRole')} disabled={loading}>
              <Shield size={18} style={{ marginRight: '8px' }} />
              Tugaskan Izin ke Peran
            </Button>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              <RefreshCcw size={18} style={{ marginRight: '8px' }} />
              Muat Ulang Peran
            </Button>
          </>
        );
      case '/admin/permissions':
        return (
          <>
            <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
              Muat Ulang Izin
            </Button>
          </>
        );
      default:
        return supportsList(path) ? (
          <Button variant="secondary" size="md" onClick={() => void loadList()} disabled={loading}>
            <RefreshCcw size={18} style={{ marginRight: '8px' }} />
            Muat Ulang Data
          </Button>
        ) : null;
    }
  };

  const renderLeaveTypeView = () => {
    if (!tableRows.length) return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Belum ada jenis cuti terdaftar.</div>
    );

    return (
      <div className="leave-type-grid">
        {tableRows.map((row, i) => {
          const name = row[tableColumns.indexOf('NAME')] || row[tableColumns.indexOf('Name')] || 'Unknown';
          const code = row[tableColumns.indexOf('CODE')] || row[tableColumns.indexOf('Code')] || '-';
          const desc = row[tableColumns.indexOf('DESCRIPTION')] || row[tableColumns.indexOf('Description')] || '';
          const isPaid = row[tableColumns.indexOf('IS_PAID')] || row[tableColumns.indexOf('Is Paid')];
          const isActive = row[tableColumns.indexOf('IS_ACTIVE')] || row[tableColumns.indexOf('Is Active')];

          return (
            <div key={i} className="leave-type-card glass-shimmer" onClick={() => {
              const obj: any = {};
              tableColumns.forEach((col, idx) => { obj[col.toLowerCase()] = row[idx]; });
              setFormState(obj);
            }}>
              <div className="leave-type-icon-box">
                <CalendarDays size={24} />
              </div>
              <div className="leave-type-info">
                <h3>{String(name)}</h3>
                <p>{String(desc)}</p>
                <small style={{ color: '#94a3b8', fontWeight: 600 }}>CODE: {String(code)}</small>
              </div>
              <div className="leave-type-meta">
                <Badge variant={isPaid === 'Yes' || String(isPaid) === 'true' ? 'success' : 'default'}>
                  {isPaid === 'Yes' || String(isPaid) === 'true' ? 'Paid' : 'Unpaid'}
                </Badge>
                <Badge variant={isActive === 'Yes' || String(isActive) === 'true' ? 'info' : 'danger'}>
                  {isActive === 'Yes' || String(isActive) === 'true' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLeavePolicyView = () => {
    if (!tableRows.length) return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Belum ada kebijakan cuti terdaftar.</div>
    );

    return (
      <div className="leave-policy-list">
        {tableRows.map((row, i) => {
          const year = row[tableColumns.indexOf('YEAR')] || row[tableColumns.indexOf('Year')] || '-';
          const name = row[tableColumns.indexOf('NAME')] || row[tableColumns.indexOf('Name')] || 'General Policy';
          const allowance = row[tableColumns.indexOf('ANNUAL_ALLOWANCE')] || row[tableColumns.indexOf('Annual Allowance')] || '0';
          const carryOver = row[tableColumns.indexOf('CARRY_OVER_ALLOWANCE')] || row[tableColumns.indexOf('Carry Over Allowance')] || '0';
          const active = row[tableColumns.indexOf('ACTIVE')] || row[tableColumns.indexOf('Active')];

          return (
            <div key={i} className="leave-policy-item glass-shimmer" onClick={() => {
              const obj: any = {};
              tableColumns.forEach((col, idx) => { obj[col.toLowerCase()] = row[idx]; });
              setFormState(obj);
            }}>
              <div className="policy-main-info">
                <div className="policy-year-badge">{String(year)}</div>
                <div className="policy-details">
                  <span className="policy-name">{String(name)}</span>
                  <div className="policy-stats">
                    <div className="stat-group">
                      <span className="stat-label">Allowance</span>
                      <span className="stat-value">{String(allowance)} Days</span>
                    </div>
                    <div className="stat-group">
                      <span className="stat-label">Carry Over</span>
                      <span className="stat-value">{String(carryOver)} Days</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="policy-actions">
                <Badge variant={String(active) === 'Yes' || String(active) === 'true' ? 'success' : 'danger'}>
                  {String(active) === 'Yes' || String(active) === 'true' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAdminLeaveView = () => {
    if (!tableRows.length) return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Belum ada pengajuan cuti masuk.</div>
    );

    return (
      <div className="leave-type-grid">
        {tableRows.map((row, i) => {
          const employee = row[tableColumns.indexOf('EMPLOYEE')] || row[tableColumns.indexOf('Employee')] || 'N/A';
          const type = row[tableColumns.indexOf('LEAVE_TYPE')] || row[tableColumns.indexOf('Leave Type')] || '-';
          const start = row[tableColumns.indexOf('START')] || row[tableColumns.indexOf('Start')] || '-';
          const end = row[tableColumns.indexOf('END')] || row[tableColumns.indexOf('End')] || '-';
          const status = row[tableColumns.indexOf('STATUS')] || row[tableColumns.indexOf('Status')] || 'Pending';

          const statusVariant = 
            status === 'Approved' ? 'success' : 
            status === 'Rejected' ? 'danger' : 
            status === 'Pending' ? 'warning' : 'default';

          return (
            <div key={i} className="leave-type-card glass-shimmer" onClick={() => {
              const obj: any = {};
              tableColumns.forEach((col, idx) => { obj[col.toLowerCase().replace(/ /g, '_')] = row[idx]; });
              setFormState(obj);
            }}>
              <div className="leave-type-icon-box">
                <Users size={24} />
              </div>
              <div className="leave-type-info">
                <h3>{String(employee)}</h3>
                <p>{String(type)} Cuti</p>
                <small style={{ color: '#94a3b8', fontWeight: 600 }}>{String(start)} s/d {String(end)}</small>
              </div>
              <div className="leave-type-meta">
                <Badge variant={statusVariant}>{String(status)}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMyLeaveView = () => {
    if (!tableRows.length) return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Belum ada pengajuan cuti.</div>
    );

    return (
      <div className="leave-policy-list">
        {tableRows.map((row, i) => {
          const type = row[tableColumns.indexOf('TYPE')] || row[tableColumns.indexOf('Type')] || row[tableColumns.indexOf('LEAVE_TYPE')] || row[tableColumns.indexOf('Leave Type')] || '-';
          const start = row[tableColumns.indexOf('START_DATE')] || row[tableColumns.indexOf('Start Date')] || row[tableColumns.indexOf('START')] || row[tableColumns.indexOf('Start')] || '-';
          const end = row[tableColumns.indexOf('END_DATE')] || row[tableColumns.indexOf('End Date')] || row[tableColumns.indexOf('END')] || row[tableColumns.indexOf('End')] || '-';
          const status = row[tableColumns.indexOf('STATUS')] || row[tableColumns.indexOf('Status')] || 'Pending';
          const total = row[tableColumns.indexOf('TOTAL_DAYS')] || row[tableColumns.indexOf('Total Days')] || '-';

          const statusVariant = 
            status === 'Approved' ? 'success' : 
            status === 'Rejected' ? 'danger' : 
            status === 'Pending' ? 'warning' : 'default';

          return (
            <div key={i} className="leave-policy-item glass-shimmer">
              <div className="policy-main-info">
                <div className="policy-year-badge" style={{ background: statusVariant === 'success' ? '#10b981' : statusVariant === 'warning' ? '#f59e0b' : '#ef4444' }}>
                  {String(total)}d
                </div>
                <div className="policy-details">
                  <span className="policy-name">{String(type)}</span>
                  <div className="policy-stats">
                    <div className="stat-group">
                      <span className="stat-label">Range</span>
                      <span className="stat-value">{String(start)} - {String(end)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="policy-actions">
                <Badge variant={statusVariant}>{String(status)}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderProfileView = () => {
    if (!tableRows.length) return (
      <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b', background: 'rgba(255,255,255,0.5)', borderRadius: '16px' }}>
        <UserCircle size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
        <p>Belum ada data profil tersedia. Silakan muat ulang atau lengkapi data Anda.</p>
        <Button variant="primary" size="md" onClick={() => setActiveCrudMode('create')} style={{ marginTop: '1.5rem' }}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Lengkapi Profil Sekarang
        </Button>
      </div>
    );
    
    // Attempt to find user name and role if nested
    const profileObj = (tableRows[0] as any);
    
    return (
      <div className="profile-detail-view">
        <div className="profile-header-box">
          <div className="profile-avatar-large">
            <UserCircle size={64} />
          </div>
          <div className="profile-header-info">
            <h2>Data Profil Pribadi</h2>
            <p>Informasi dasar dan kontak yang terdaftar di sistem.</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Button variant="outline" size="sm" onClick={() => setActiveCrudMode('manage')}>
              <Settings size={18} style={{ marginRight: '8px' }} />
              Perbarui Data
            </Button>
          </div>
        </div>
        <div className="profile-grid">
          {tableColumns.map((col, idx) => {
            const val = tableRows[0][idx];
            if (!val || val === '-') return null;
            return (
              <div key={col} className="profile-field">
                <span className="field-label">{col.replace(/_/g, ' ').toUpperCase()}</span>
                <span className="field-value">{String(val)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`section-page section-variant-${sectionKey}`}>
      <Card className="section-page-header glass-shimmer" glass>
        <div className="section-hero-copy">
          <span className="section-badge">Management Console</span>
          <h1 className="section-title">{section.title}</h1>
          <p className="section-subtitle">{section.subtitle}</p>
        </div>
        <div className="section-hero-icon-wrapper">
          <Icon size={80} strokeWidth={1.5} color={section.color} />
        </div>
        <div className="section-page-header-actions">
          <Button variant="primary" size="md" onClick={handleRefresh} disabled={loading || !canRefresh}>
            <Search size={18} style={{ marginRight: '8px' }} />
            Segarkan Data
          </Button>
        </div>
      </Card>

      {summaryStats.length > 0 && (
        <div className="section-summary-grid">
          {summaryStats.map((stat) => (
            <Card key={stat.label} className={`summary-card payroll-accent-${stat.variant === 'danger' ? 'red' : stat.variant === 'success' ? 'green' : stat.variant === 'warning' ? 'orange' : 'blue'}`} glass>
              <div className="summary-card-top">
                <span className="summary-card-label">{stat.label}</span>
                <Badge variant={stat.variant}>{stat.description}</Badge>
              </div>
              <h3 className="summary-card-value">{stat.value}</h3>
            </Card>
          ))}
        </div>
      )}

      {(insightsChartData.headcountByDepartment.length > 0 || insightsChartData.leaveType.length > 0 || insightsChartData.helpdeskStatus.length > 0) && (
        <div className="insights-charts-grid">
          {insightsChartData.headcountByDepartment.length > 0 && (
            <Card className="chart-card" glass>
              <div className="chart-header">
                <h3>Distribusi Headcount</h3>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={insightsChartData.headcountByDepartment} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="value" fill={section.color} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {insightsChartData.leaveType.length > 0 && (
            <Card className="chart-card" glass>
              <div className="chart-header">
                <h3>Jenis Cuti</h3>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={insightsChartData.leaveType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} fill="var(--color-primary)" label />
                    {insightsChartData.leaveType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['var(--color-primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {insightsChartData.helpdeskStatus.length > 0 && (
            <Card className="chart-card" glass>
              <div className="chart-header">
                <h3>Status Tiket</h3>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={insightsChartData.helpdeskStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} fill="#10b981" label />
                    {insightsChartData.helpdeskStatus.map((_, index) => (
                      <Cell key={`cell-status-${index}`} fill={['#10b981', 'var(--color-primary)', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}

      <Card className="section-action-card" glass>
        <div className="section-action-header">
          <div>
            <h2>Panel Operasional</h2>
            <p>
              {supportsCrudModeSplit(path)
                ? `Mode: ${activeCrudMode === 'create' ? 'Input Data Baru' : 'Manajemen Data'}.`
                : 'Eksekusi aksi cepat dan manajemen data sistem secara real-time.'}
            </p>
          </div>
          <div className="action-status-wrap">
            <Badge variant={statusMessage.includes('Error') ? 'danger' : 'info'}>{statusMessage}</Badge>
            {loading && <span className="action-loading">Memproses...</span>}
          </div>
        </div>

        <div className="section-action-form">
          <div className="section-action-inputs">
            {renderFormFields()}
          </div>
          <div className="section-action-buttons">
            {renderActionButtons()}
          </div>
        </div>
      </Card>

      {tableColumns.length > 0 && (
        <Card className="section-table-card" glass>
          <div className="section-table-header">
            <div>
              <h2>Data Terdaftar</h2>
              <p>Daftar entri yang tersimpan dalam modul {section.title}.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading || !canRefresh}>
              Muat Ulang
            </Button>
          </div>

          {path === '/my/profile' ? renderProfileView() : 
           path === '/leave/type' ? renderLeaveTypeView() :
           path === '/leave/policy' ? renderLeavePolicyView() :
           path === '/leave/my-leave' ? renderMyLeaveView() :
           path === '/leave/requests' || path === '/leave/approval' ? renderAdminLeaveView() : (
            <div className="ui-table-overflow">
              <table className="ui-table">
                <thead>
                  <tr>
                    {tableColumns.map((column: string) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length > 0 ? (
                    tableRows.map((row, i) => {
                      // Find ID if it exists in the row
                      const idIdx = tableColumns.findIndex(c => c.toLowerCase() === 'id');
                      const rowId = idIdx !== -1 ? String(row[idIdx]) : '';

                      return (
                        <tr key={i}>
                          {row.map((cell, j) => {
                            const colName = tableColumns[j].toLowerCase();
                            
                            // Hide ID column if not explicitly asked
                            if (colName === 'id') return null;

                            // Handle Actions column
                            if (colName === 'actions') {
                              return (
                                <td key={j} className="td-center">
                                  <div className="action-btn-group">
                                    <button 
                                      className="action-btn action-btn-edit" 
                                      onClick={() => {
                                        const obj: any = {};
                                        tableColumns.forEach((col, idx) => { obj[col.toLowerCase()] = row[idx]; });
                                        setFormState(obj);
                                        setActiveCrudMode('manage');
                                      }}
                                      title="Edit"
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    <button 
                                      className="action-btn action-btn-delete"
                                      onClick={() => {
                                        setFormState({ id: rowId });
                                      }}
                                      title="Hapus"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={j} className={String(cell).length > 50 ? 'long-text' : ''}>
                                {formatVal(cell)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={tableColumns.length} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        Belum ada data tersedia untuk ditampilkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tableRows.length > 0 && totalPages > 1 && (
            <div className="table-pagination">
              <div className="pagination-info">
                Menampilkan <b>{(currentPage - 1) * 15 + 1}</b> sampai <b>{Math.min(currentPage * 15, totalItems)}</b> dari <b>{totalItems}</b> data
              </div>
              <div className="pagination-controls">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => void loadList(currentPage - 1)} 
                  disabled={currentPage <= 1 || loading}
                >
                  <ChevronLeft size={16} /> Sebelumnya
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  // Simple logic to show a few pages around current if total is large
                  // For now just show first 5 or total
                  return (
                    <Button 
                      key={pageNum}
                      variant={currentPage === pageNum ? 'primary' : 'outline'} 
                      size="sm"
                      onClick={() => void loadList(pageNum)}
                      disabled={loading}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                {totalPages > 5 && <span style={{ padding: '0 0.5rem' }}>...</span>}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => void loadList(currentPage + 1)} 
                  disabled={currentPage >= totalPages || loading}
                >
                  Berikutnya <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default SectionPage;
