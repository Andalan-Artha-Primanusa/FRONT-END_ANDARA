import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart3, Users, CalendarDays, Clock, Wallet, RefreshCw, PieChart as PieIcon, Activity, CheckCircle, XCircle,
  TrendingUp, Briefcase, Package, Handshake, UserCheck, UserMinus, UserPlus, GripVertical, DollarSign, ClipboardList,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { api } from '@/shared/api/httpClient';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import './ReportsDashboardPage.css';

type Rec = Record<string, unknown>;
const toRec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
const extractArr = (raw: unknown): Rec[] => {
  const p = (() => { const r = toRec(raw); return r.data ?? raw; })();
  if (Array.isArray(p)) return p.filter((i): i is Rec => !!i && typeof i === 'object');
  const r = toRec(p);
  for (const k of ['items', 'rows', 'data', 'results']) { const c = r[k]; if (Array.isArray(c)) return c.filter((i): i is Rec => !!i && typeof i === 'object'); }
  return [];
};
const getStr = (rec: Rec, keys: string[]): string => { for (const k of keys) { const v = rec[k]; if (typeof v === 'string' && v.trim()) return v.trim(); } return ''; };
const getNum = (v: unknown): number => { if (typeof v === 'number' && Number.isFinite(v)) return v; if (typeof v === 'string') { const p = Number(v); if (Number.isFinite(p)) return p; } return 0; };

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const chartColors = ['var(--color-primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const tooltipStyle = {
  contentStyle: { backgroundColor: '#fff', border: '1px solid var(--color-primary-light)', borderRadius: '8px' },
  labelStyle: { color: 'var(--color-primary-dark)', fontWeight: 'bold' as const },
};

const fmtMonth = (period: string) => {
  if (!period) return period;
  const [y, m] = period.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return Number.isNaN(d.getTime()) ? period : d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
};

const fmtRp = (n: number) => `Rp ${(n || 0).toLocaleString("id-ID")}`;

const STORAGE_KEY = 'hris_report_widget_order';

interface WidgetDef {
  id: string;
  category: string;
  title: string;
}

const ALL_WIDGETS: WidgetDef[] = [
  // Summary
  { id: 'summary_metrics', category: 'Ringkasan', title: 'Metrik Ringkasan' },
  { id: 'attendance_trend_weekly', category: 'Ringkasan', title: 'Tren Kehadiran' },
  { id: 'dept_headcount', category: 'Ringkasan', title: 'Karyawan per Departemen' },
  { id: 'leave_type_pie', category: 'Ringkasan', title: 'Jenis Cuti' },
  { id: 'payroll_status_bar', category: 'Ringkasan', title: 'Status Payroll' },
  // Attendance
  { id: 'attendance_metrics', category: 'Absensi', title: 'Metrik Absensi' },
  { id: 'attendance_weekly', category: 'Absensi', title: 'Tren Absensi Mingguan' },
  { id: 'attendance_monthly', category: 'Absensi', title: 'Tren Absensi Bulanan' },
  { id: 'attendance_breakdown', category: 'Absensi', title: 'Breakdown Status Absensi' },
  { id: 'attendance_dept', category: 'Absensi', title: 'Absensi per Departemen' },
  // Leave
  { id: 'leave_metrics', category: 'Cuti', title: 'Metrik Cuti' },
  { id: 'leave_monthly_trend', category: 'Cuti', title: 'Tren Pengajuan Cuti Bulanan' },
  { id: 'leave_status_pie', category: 'Cuti', title: 'Status Cuti' },
  { id: 'leave_type_dist', category: 'Cuti', title: 'Distribusi Jenis Cuti' },
  { id: 'leave_days_by_type', category: 'Cuti', title: 'Total Hari per Jenis Cuti' },
  // Payroll
  { id: 'payroll_metrics', category: 'Payroll', title: 'Metrik Payroll' },
  { id: 'payroll_period_status', category: 'Payroll', title: 'Status Payroll per Periode' },
  { id: 'payroll_nominal_trend', category: 'Payroll', title: 'Tren Nominal Payroll' },
  { id: 'payroll_status_prop', category: 'Payroll', title: 'Proporsi Status Payroll' },
  { id: 'payroll_dept_spend', category: 'Payroll', title: 'Pengeluaran per Departemen' },
  // Assets
  { id: 'asset_metrics', category: 'Aset', title: 'Metrik Aset' },
  { id: 'asset_category', category: 'Aset', title: 'Aset per Kategori' },
  { id: 'asset_status_pie', category: 'Aset', title: 'Status Aset' },
  { id: 'asset_value_category', category: 'Aset', title: 'Nilai Aset per Kategori' },
  { id: 'asset_assign_dept', category: 'Aset', title: 'Penugasan Aset per Departemen' },
  // Employee
  { id: 'employee_metrics', category: 'SDM', title: 'Metrik SDM' },
  { id: 'employee_dept', category: 'SDM', title: 'Karyawan per Departemen (SDM)' },
  { id: 'employee_gender', category: 'SDM', title: 'Diversitas Gender' },
  { id: 'employee_status', category: 'SDM', title: 'Status Kepegawaian' },
  { id: 'employee_recruitment_trend', category: 'SDM', title: 'Tren Rekrutmen' },
];

function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
  };
  return (
    <div ref={setNodeRef} style={style} className="reports-chart-card reports-chart-card--sortable">
      <div className="reports-drag-handle" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </div>
      {children}
    </div>
  );
}

const ReportsDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return ALL_WIDGETS.map(w => w.id);
  });

  // Raw data states
  const [employees, setEmployees] = useState<Rec[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Rec[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<Rec[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<Rec[]>([]);
  const [assets, setAssets] = useState<Rec[]>([]);
  const [assignments, setAssignments] = useState<Rec[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, attRes, leaveRes, payRes, assetRes, assRes] = await Promise.allSettled([
        api.get('/employees'),
        api.get('/attendance/all'),
        api.get('/leaves'),
        api.get('/payroll'),
        api.get('/assets'),
        api.get('/assets/assignments'),
      ]);
      setEmployees(empRes.status === 'fulfilled' ? extractArr(empRes.value.data) : []);
      setAttendanceRecords(attRes.status === 'fulfilled' ? extractArr(attRes.value.data) : []);
      setLeaveRecords(leaveRes.status === 'fulfilled' ? extractArr(leaveRes.value.data) : []);
      setPayrollRecords(payRes.status === 'fulfilled' ? extractArr(payRes.value.data) : []);
      setAssets(assetRes.status === 'fulfilled' ? extractArr(assetRes.value.data) : []);
      setAssignments(assRes.status === 'fulfilled' ? extractArr(assRes.value.data) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const saveOrder = useCallback((newOrder: string[]) => {
    setWidgetOrder(newOrder);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder)); } catch { /* ignore */ }
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgetOrder.indexOf(String(active.id));
    const newIndex = widgetOrder.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = [...widgetOrder];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, String(active.id));
    saveOrder(newOrder);
  }, [widgetOrder, saveOrder]);

  const activeWidgets = useMemo(() => {
    const mapping = Object.fromEntries(ALL_WIDGETS.map(w => [w.id, w]));
    return widgetOrder.filter(id => mapping[id]).map(id => mapping[id]);
  }, [widgetOrder]);

  // --- Derived data ---
  const totalEmployees = employees.length;
  const present = useMemo(() => attendanceRecords.filter(r => {
    const s = getStr(r, ['status', 'attendance_status']).toLowerCase();
    return s.includes('present') || s.includes('hadir') || (!s.includes('absent') && !s.includes('late') && getStr(r, ['check_in', 'checkIn']));
  }).length, [attendanceRecords]);
  const absent = useMemo(() => attendanceRecords.filter(r => { const s = getStr(r, ['status', 'attendance_status']).toLowerCase(); return s.includes('absent') || s.includes('alpa'); }).length, [attendanceRecords]);
  const late = useMemo(() => attendanceRecords.filter(r => { const s = getStr(r, ['status', 'attendance_status']).toLowerCase(); return s.includes('late') || s.includes('terlambat'); }).length, [attendanceRecords]);

  const pendingLeaves = useMemo(() => leaveRecords.filter(r => getStr(r, ['status']).toLowerCase() === 'pending').length, [leaveRecords]);
  const approvedLeaves = useMemo(() => leaveRecords.filter(r => ['approved', 'accepted'].includes(getStr(r, ['status']).toLowerCase())).length, [leaveRecords]);
  const rejectedLeaves = useMemo(() => leaveRecords.filter(r => ['rejected', 'declined'].includes(getStr(r, ['status']).toLowerCase())).length, [leaveRecords]);

  const paid = useMemo(() => payrollRecords.filter(r => ['paid', 'approved'].includes(getStr(r, ['status']).toLowerCase())).length, [payrollRecords]);
  const totalNet = useMemo(() => payrollRecords.reduce((s, r) => s + getNum(r.net_salary ?? r.total_salary ?? r.amount), 0), [payrollRecords]);

  const activeAssets = useMemo(() => assets.filter(a => ['active', 'available'].includes(getStr(a, ['status']).toLowerCase())).length, [assets]);
  const assignedAssets = useMemo(() => assets.filter(a => getStr(a, ['status']).toLowerCase() === 'assigned').length, [assets]);
  const maintenanceAssets = useMemo(() => assets.filter(a => ['maintenance', 'repair'].includes(getStr(a, ['status']).toLowerCase())).length, [assets]);

  const activeEmployees = useMemo(() => employees.filter(e => String(e.status).toLowerCase() === 'active').length, [employees]);
  const probationEmployees = useMemo(() => employees.filter(e => String(e.status).toLowerCase() === 'pending' || String(e.status).toLowerCase() === 'probation').length, [employees]);
  const inactiveEmployees = useMemo(() => employees.filter(e => String(e.status).toLowerCase() === 'inactive' || String(e.status).toLowerCase() === 'resigned').length, [employees]);

  // Chart data: Weekly attendance trend (from attendance records)
  const weeklyTrend = useMemo(() => {
    const agg = dayOrder.map(day => ({ day, hadir: 0, absen: 0, terlambat: 0 }));
    attendanceRecords.forEach(r => {
      const raw = getStr(r, ['date', 'attendance_date', 'created_at', 'check_in']);
      if (!raw) return;
      const d = new Date(raw); if (Number.isNaN(d.getTime())) return;
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const t = agg.find(a => a.day === label); if (!t) return;
      const s = getStr(r, ['status', 'attendance_status']).toLowerCase();
      if (s.includes('late') || s.includes('terlambat')) t.terlambat++;
      else if (s.includes('absent') || s.includes('alpa')) t.absen++;
      else t.hadir++;
    });
    return agg;
  }, [attendanceRecords]);

  // Monthly attendance trend
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { hadir: number; absen: number }>();
    attendanceRecords.forEach(r => {
      const raw = getStr(r, ['date', 'attendance_date', 'created_at', 'check_in']);
      if (!raw) return;
      const d = new Date(raw); if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = map.get(key) || { hadir: 0, absen: 0 };
      const s = getStr(r, ['status', 'attendance_status']).toLowerCase();
      if (s.includes('absent') || s.includes('alpa')) cur.absen++; else cur.hadir++;
      map.set(key, cur);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
      const [yr, mo] = k.split('-');
      const label = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      return { month: label, ...v };
    });
  }, [attendanceRecords]);

  // Attendance status breakdown
  const attendanceStatusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    attendanceRecords.forEach(r => {
      const s = getStr(r, ['status', 'attendance_status']) || 'Unknown';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [attendanceRecords]);

  // Attendance by department
  const attendanceDept = useMemo(() => {
    const map = new Map<string, { hadir: number; total: number }>();
    employees.forEach(e => {
      const dept = getStr(e, ['department', 'department_name']) || 'Unassigned';
      const cur = map.get(dept) || { hadir: 0, total: 0 };
      cur.total++;
      map.set(dept, cur);
    });
    attendanceRecords.forEach(r => {
      const dept = getStr(r, ['department', 'department_name']) || 'Unassigned';
      if (map.has(dept)) {
        const s = getStr(r, ['status', 'attendance_status']).toLowerCase();
        if (!s.includes('absent') && !s.includes('alpa')) map.get(dept)!.hadir++;
      }
    });
    return Array.from(map, ([name, v]) => ({ name, hadir: v.hadir, total: v.total }));
  }, [employees, attendanceRecords]);

  // Department headcount
  const deptHeadcount = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach(e => {
      const dept = getStr(e, ['department', 'department_name']) || 'Unassigned';
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [employees]);

  // Leave monthly trend
  const leaveMonthlyTrend = useMemo(() => {
    const map = new Map<string, { pending: number; approved: number; rejected: number }>();
    leaveRecords.forEach(r => {
      const raw = getStr(r, ['start_date', 'created_at']);
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = map.get(key) || { pending: 0, approved: 0, rejected: 0 };
      const s = getStr(r, ['status']).toLowerCase();
      if (s === 'pending') cur.pending++;
      else if (s === 'approved' || s === 'accepted') cur.approved++;
      else if (s === 'rejected' || s === 'declined') cur.rejected++;
      map.set(key, cur);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: fmtMonth(k), ...v }));
  }, [leaveRecords]);

  // Leave type distribution
  const leaveTypeDist = useMemo(() => {
    const map = new Map<string, number>();
    leaveRecords.forEach(r => {
      const t = getStr(r, ['type', 'leave_type', 'leaveType']) || 'Unknown';
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [leaveRecords]);

  // Leave days by type
  const leaveDaysByType = useMemo(() => {
    const map = new Map<string, number>();
    leaveRecords.forEach(r => {
      const t = getStr(r, ['type', 'leave_type', 'leaveType']) || 'Unknown';
      map.set(t, (map.get(t) || 0) + getNum(r.total_days ?? r.days));
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [leaveRecords]);

  // Payroll timeline
  const payrollTimeline = useMemo(() => {
    const map = new Map<string, { paid: number; pending: number; net: number }>();
    payrollRecords.forEach(r => {
      const period = getStr(r, ['period']) || 'Unknown';
      const cur = map.get(period) || { paid: 0, pending: 0, net: 0 };
      const s = getStr(r, ['status']).toLowerCase();
      if (s === 'paid' || s === 'approved') cur.paid++; else cur.pending++;
      cur.net += getNum(r.net_salary ?? r.total_salary ?? r.amount);
      map.set(period, cur);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([period, v]) => ({ month: fmtMonth(period), ...v }));
  }, [payrollRecords]);

  // Payroll status data
  const payrollStatusData = useMemo(() => {
    const map = new Map<string, number>();
    payrollRecords.forEach(r => {
      const s = getStr(r, ['status']) || 'Unknown';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [payrollRecords]);

  // Payroll dept data
  const payrollDeptData = useMemo(() => {
    const map = new Map<string, number>();
    payrollRecords.forEach(r => {
      const d = getStr(r, ['department', 'department_name']) || 'Unassigned';
      map.set(d, (map.get(d) || 0) + getNum(r.net_salary ?? r.total_salary ?? r.amount));
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [payrollRecords]);

  // Asset category data
  const assetCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    assets.forEach(a => {
      const c = getStr(a, ['category', 'asset_category']) || 'Lainnya';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [assets]);

  // Asset status data
  const assetStatusData = useMemo(() => {
    const map = new Map<string, number>();
    assets.forEach(a => {
      const s = getStr(a, ['status']) || 'Unknown';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [assets]);

  // Asset value by category
  const assetValueData = useMemo(() => {
    const map = new Map<string, number>();
    assets.forEach(a => {
      const c = getStr(a, ['category', 'asset_category']) || 'Lainnya';
      map.set(c, (map.get(c) || 0) + getNum(a.cost ?? a.value ?? a.purchase_cost));
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [assets]);

  // Assignment by department
  const assignDeptData = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach(a => {
      const d = getStr(a, ['department', 'department_name']) || 'Unassigned';
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [assignments]);

  // Employee gender data
  const genderData = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach(e => {
      const g = getStr(e, ['gender']).toLowerCase();
      const label = g === 'male' || g === 'laki-laki' ? 'Laki-laki' : (g === 'female' || g === 'perempuan' ? 'Perempuan' : 'Lainnya');
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [employees]);

  // Employee status data
  const empStatusData = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach(e => {
      const s = getStr(e, ['employment_status', 'status']) || 'Kontrak';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [employees]);

  // New employee trend
  const hiringTrend = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach(e => {
      const d = getStr(e, ['hire_date', 'join_date']);
      if (d) {
        const month = d.substring(0, 7);
        map.set(month, (map.get(month) || 0) + 1);
      }
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const renderWidget = useCallback((widget: WidgetDef) => {
    switch (widget.id) {
      // ==================== SUMMARY ====================
      case 'summary_metrics':
        return (
          <>
            <h2 className="reports-chart-title"><BarChart3 size={16} /> Ringkasan</h2>
            <p className="reports-chart-subtitle">Metrik utama seluruh perusahaan</p>
            <div className="leave-requests-wrapper" style={{ marginTop: '1rem' }}>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Total Karyawan</p><p className="leave-summary-subtitle">{activeEmployees} aktif</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-blue"><Users size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-blue">{totalEmployees}</div>
                <p className="leave-summary-trend">Karyawan Terdaftar</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Kehadiran</p><p className="leave-summary-subtitle">{present} hadir</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-green"><CheckCircle size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-green">{totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0}%</div>
                <p className="leave-summary-trend">Tingkat Kehadiran</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Cuti Tertunda</p><p className="leave-summary-subtitle">{leaveRecords.length} total cuti</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-orange"><CalendarDays size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-orange">{pendingLeaves}</div>
                <p className="leave-summary-trend">Cuti Tertunda</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Payroll Diproses</p><p className="leave-summary-subtitle">{payrollRecords.length} records</p></div>
                  <div className="leave-summary-icon-wrapper" style={{ background: '#f5f3ff' }}><Wallet size={28} color="#8b5cf6" /></div>
                </div>
                <div className="leave-summary-value" style={{ color: '#8b5cf6' }}>{payrollRecords.length > 0 ? Math.round((paid / payrollRecords.length) * 100) : 0}%</div>
                <p className="leave-summary-trend">Payroll Diproses</p>
              </div>
            </div>
          </>
        );

      case 'attendance_trend_weekly':
        return (
          <>
            <h2 className="reports-chart-title"><BarChart3 size={16} /> Tren Kehadiran</h2>
            <p className="reports-chart-subtitle">Perbandingan kehadiran kumulatif dalam satu minggu</p>
            {weeklyTrend.some(d => d.hadir > 0 || d.absen > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={weeklyTrend}>
                  <defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="hadir" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#gp)" name="Hadir" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data absensi untuk company aktif ini</div>}
          </>
        );

      case 'dept_headcount':
        return (
          <>
            <h2 className="reports-chart-title"><Users size={16} /> Karyawan per Departemen</h2>
            <p className="reports-chart-subtitle">Distribusi jumlah SDM berdasarkan unit kerja</p>
            {deptHeadcount.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptHeadcount}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="Karyawan" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data departemen untuk company aktif ini.</div>}
          </>
        );

      case 'leave_type_pie':
        return (
          <>
            <h2 className="reports-chart-title"><PieIcon size={16} /> Jenis Cuti</h2>
            <p className="reports-chart-subtitle">Proporsi permohonan cuti berdasarkan kategori</p>
            {leaveTypeDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={leaveTypeDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {leaveTypeDist.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data cuti untuk company aktif ini</div>}
          </>
        );

      case 'payroll_status_bar':
        return (
          <>
            <h2 className="reports-chart-title"><Wallet size={16} /> Status Payroll</h2>
            <p className="reports-chart-subtitle">Perbandingan status pemrosesan payroll</p>
            {payrollTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={payrollTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="paid" stackId="a" fill="#10b981" name="Diproses" />
                  <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Menunggu" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data payroll untuk company aktif ini.</div>}
          </>
        );

      // ==================== ATTENDANCE ====================
      case 'attendance_metrics':
        return (
          <>
            <h2 className="reports-chart-title"><Activity size={16} /> Metrik Absensi</h2>
            <p className="reports-chart-subtitle">Rekapitulasi kehadiran</p>
            <div className="leave-requests-wrapper" style={{ marginTop: '1rem' }}>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Total Catatan</p><p className="leave-summary-subtitle">Semua records</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-blue"><Activity size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-blue">{attendanceRecords.length}</div>
                <p className="leave-summary-trend">Total Absensi</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Hadir</p><p className="leave-summary-subtitle">Total hadir</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-green"><CheckCircle size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-green">{present}</div>
                <p className="leave-summary-trend">Hadir</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Absen</p><p className="leave-summary-subtitle">Tidak hadir</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-red"><XCircle size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-red">{absent}</div>
                <p className="leave-summary-trend">Absen</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Terlambat</p><p className="leave-summary-subtitle">Late check-in</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-orange"><Clock size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-orange">{late}</div>
                <p className="leave-summary-trend">Terlambat</p>
              </div>
            </div>
          </>
        );

      case 'attendance_weekly':
        return (
          <>
            <h2 className="reports-chart-title"><Activity size={16} /> Tren Absensi Mingguan</h2>
            <p className="reports-chart-subtitle">Hadir, absen, dan terlambat per hari</p>
            {weeklyTrend.some(d => d.hadir > 0 || d.absen > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={weeklyTrend}>
                  <defs>
                    <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="day" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="hadir" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gh)" name="Hadir" />
                  <Area type="monotone" dataKey="absen" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#ga)" name="Absen" />
                  <Area type="monotone" dataKey="terlambat" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="none" name="Terlambat" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'attendance_monthly':
        return (
          <>
            <h2 className="reports-chart-title"><TrendingUp size={16} /> Tren Absensi Bulanan</h2>
            <p className="reports-chart-subtitle">Perbandingan hadir vs absen per bulan</p>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="month" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="hadir" fill="#10b981" radius={[6, 6, 0, 0]} name="Hadir" />
                  <Bar dataKey="absen" fill="#ef4444" radius={[6, 6, 0, 0]} name="Absen" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'attendance_breakdown':
        return (
          <>
            <h2 className="reports-chart-title"><PieIcon size={16} /> Breakdown Status Absensi</h2>
            <p className="reports-chart-subtitle">Proporsi status kehadiran</p>
            {attendanceStatusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Pie data={attendanceStatusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {attendanceStatusBreakdown.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'attendance_dept':
        return (
          <>
            <h2 className="reports-chart-title"><Users size={16} /> Absensi per Departemen</h2>
            <p className="reports-chart-subtitle">Total kehadiran berdasarkan departemen</p>
            {attendanceDept.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={attendanceDept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(10, 122, 62,0.1)' }} />
                  <Legend />
                  <Bar dataKey="hadir" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="Hadir" />
                  <Bar dataKey="total" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="Total Karyawan" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      // ==================== LEAVE ====================
      case 'leave_metrics':
        return (
          <>
            <h2 className="reports-chart-title"><ClipboardList size={16} /> Metrik Cuti</h2>
            <p className="reports-chart-subtitle">Rekapitulasi pengajuan cuti</p>
            <div className="leave-requests-wrapper" style={{ marginTop: '1rem' }}>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Total Pengajuan</p><p className="leave-summary-subtitle">Semua records</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-blue"><CalendarDays size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-blue">{leaveRecords.length}</div>
                <p className="leave-summary-trend">Total Cuti</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Disetujui</p><p className="leave-summary-subtitle">Cuti disetujui</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-green"><CheckCircle size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-green">{approvedLeaves}</div>
                <p className="leave-summary-trend">Cuti Disetujui</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Menunggu</p><p className="leave-summary-subtitle">Menunggu persetujuan</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-orange"><Clock size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-orange">{pendingLeaves}</div>
                <p className="leave-summary-trend">Menunggu</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Ditolak</p><p className="leave-summary-subtitle">Cuti ditolak</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-red"><XCircle size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-red">{rejectedLeaves}</div>
                <p className="leave-summary-trend">Cuti Ditolak</p>
              </div>
            </div>
          </>
        );

      case 'leave_monthly_trend':
        return (
          <>
            <h2 className="reports-chart-title"><TrendingUp size={16} /> Tren Pengajuan Cuti Bulanan</h2>
            <p className="reports-chart-subtitle">Jumlah pengajuan per bulan berdasarkan status</p>
            {leaveMonthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={leaveMonthlyTrend}>
                  <defs>
                    <linearGradient id="lga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="lgp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="month" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#lga)" name="Approved" />
                  <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#lgp)" name="Pending" />
                  <Area type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="none" name="Rejected" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'leave_status_pie':
        return (
          <>
            <h2 className="reports-chart-title"><PieIcon size={16} /> Status Cuti</h2>
            <p className="reports-chart-subtitle">Proporsi approved, pending, dan rejected</p>
            {leaveTypeDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Pie data={[{ name: 'Approved', value: approvedLeaves }, { name: 'Pending', value: pendingLeaves }, { name: 'Rejected', value: rejectedLeaves }].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'leave_type_dist':
        return (
          <>
            <h2 className="reports-chart-title"><CalendarDays size={16} /> Distribusi Jenis Cuti</h2>
            <p className="reports-chart-subtitle">Jumlah pengajuan per jenis cuti</p>
            {leaveTypeDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={leaveTypeDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(10, 122, 62,0.1)' }} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} name="Jumlah" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'leave_days_by_type':
        return (
          <>
            <h2 className="reports-chart-title"><TrendingUp size={16} /> Total Hari per Jenis Cuti</h2>
            <p className="reports-chart-subtitle">Kumulatif hari cuti per tipe</p>
            {leaveDaysByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={leaveDaysByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(10, 122, 62,0.1)' }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Hari" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      // ==================== PAYROLL ====================
      case 'payroll_metrics':
        return (
          <>
            <h2 className="reports-chart-title"><Wallet size={16} /> Metrik Payroll</h2>
            <p className="reports-chart-subtitle">Rekapitulasi data payroll</p>
            <div className="leave-requests-wrapper" style={{ marginTop: '1rem' }}>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Total Records</p><p className="leave-summary-subtitle">Seluruh entri</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-blue"><BarChart3 size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-blue">{payrollRecords.length}</div>
                <p className="leave-summary-trend">Total Records</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Gaji Bersih</p><p className="leave-summary-subtitle">Akumulasi</p></div>
                  <div className="leave-summary-icon-wrapper" style={{ background: '#e0f2fe' }}><DollarSign size={28} color="#0891b2" /></div>
                </div>
                <div className="leave-summary-value" style={{ color: '#0891b2' }}>{fmtRp(totalNet)}</div>
                <p className="leave-summary-trend">Total Gaji</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Dibayar</p><p className="leave-summary-subtitle">Status Paid/Approved</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-green"><CheckCircle size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-green">{paid}</div>
                <p className="leave-summary-trend">Payroll Dibayar</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Karyawan</p><p className="leave-summary-subtitle">Penerima unik</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-red"><Users size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-red">{new Set(payrollRecords.map(r => getStr(r, ['employee_id', 'user_id']))).size}</div>
                <p className="leave-summary-trend">Karyawan</p>
              </div>
            </div>
          </>
        );

      case 'payroll_period_status':
        return (
          <>
            <h2 className="reports-chart-title"><BarChart3 size={16} /> Status Payroll per Periode</h2>
            <p className="reports-chart-subtitle">Perbandingan Paid vs Pending per bulan</p>
            {payrollTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={payrollTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="month" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="paid" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Dibayar" />
                  <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'payroll_nominal_trend':
        return (
          <>
            <h2 className="reports-chart-title"><Wallet size={16} /> Tren Nominal Payroll</h2>
            <p className="reports-chart-subtitle">Total net salary per bulan</p>
            {payrollTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={payrollTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="month" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} formatter={(v: any) => fmtRp(Number(v))} />
                  <Line type="monotone" dataKey="net" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} name="Net Salary" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'payroll_status_prop':
        return (
          <>
            <h2 className="reports-chart-title"><PieIcon size={16} /> Proporsi Status Payroll</h2>
            <p className="reports-chart-subtitle">Pembagian status payroll</p>
            {payrollStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Pie data={payrollStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {payrollStatusData.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', 'var(--color-primary)', '#ef4444', '#8b5cf6'][i % 5]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'payroll_dept_spend':
        return (
          <>
            <h2 className="reports-chart-title"><Users size={16} /> Pengeluaran per Departemen</h2>
            <p className="reports-chart-subtitle">Distribusi biaya gaji per departemen</p>
            {payrollDeptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={payrollDeptData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} tickFormatter={(v: number) => Intl.NumberFormat('id-ID', { notation: 'compact' }).format(v)} />
                  <Tooltip {...tooltipStyle} formatter={(v: any) => fmtRp(Number(v))} cursor={{ fill: 'rgba(10, 122, 62,0.1)' }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Total Salary" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      // ==================== ASSETS ====================
      case 'asset_metrics':
        return (
          <>
            <h2 className="reports-chart-title"><Package size={16} /> Metrik Aset</h2>
            <p className="reports-chart-subtitle">Rekapitulasi inventaris</p>
            <div className="leave-requests-wrapper" style={{ marginTop: '1rem' }}>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Total Aset</p><p className="leave-summary-subtitle">Semua inventaris</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-blue"><Briefcase size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-blue">{assets.length}</div>
                <p className="leave-summary-trend">Total Aset</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Tersedia / Aktif</p><p className="leave-summary-subtitle">Aset aktif</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-green"><CheckCircle size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-green">{activeAssets}</div>
                <p className="leave-summary-trend">Aset Aktif</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Ditugaskan</p><p className="leave-summary-subtitle">Aset pada karyawan</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-orange"><Users size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-orange">{assignedAssets}</div>
                <p className="leave-summary-trend">Aset Ditugaskan</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Maintenance</p><p className="leave-summary-subtitle">Dalam perbaikan</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-red"><Clock size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-red">{maintenanceAssets}</div>
                <p className="leave-summary-trend">Aset Maintenance</p>
              </div>
            </div>
          </>
        );

      case 'asset_category':
        return (
          <>
            <h2 className="reports-chart-title"><BarChart3 size={16} /> Aset per Kategori</h2>
            <p className="reports-chart-subtitle">Distribusi jumlah aset berdasarkan kategori</p>
            {assetCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={assetCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(10, 122, 62,0.1)' }} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} name="Jumlah Aset" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'asset_status_pie':
        return (
          <>
            <h2 className="reports-chart-title"><PieIcon size={16} /> Status Aset</h2>
            <p className="reports-chart-subtitle">Proporsi status seluruh inventaris</p>
            {assetStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Pie data={assetStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {assetStatusData.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'asset_value_category':
        return (
          <>
            <h2 className="reports-chart-title"><TrendingUp size={16} /> Nilai Aset per Kategori</h2>
            <p className="reports-chart-subtitle">Total estimasi nilai aset per kategori</p>
            {assetValueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={assetValueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} tickFormatter={(v: number) => Intl.NumberFormat('id-ID', { notation: 'compact' }).format(v)} />
                  <Tooltip {...tooltipStyle} formatter={(v: any) => fmtRp(Number(v))} cursor={{ fill: 'rgba(10, 122, 62,0.1)' }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Nilai (Rp)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'asset_assign_dept':
        return (
          <>
            <h2 className="reports-chart-title"><Handshake size={16} /> Penugasan Aset per Departemen</h2>
            <p className="reports-chart-subtitle">Jumlah aset ditugaskan per departemen</p>
            {assignDeptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={assignDeptData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(10, 122, 62,0.1)' }} />
                  <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} name="Jumlah Penugasan" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      // ==================== EMPLOYEE ====================
      case 'employee_metrics':
        return (
          <>
            <h2 className="reports-chart-title"><Users size={16} /> Metrik SDM</h2>
            <p className="reports-chart-subtitle">Rekapitulasi data karyawan</p>
            <div className="leave-requests-wrapper" style={{ marginTop: '1rem' }}>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Total Karyawan</p><p className="leave-summary-subtitle">Semua database</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-blue"><Users size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-blue">{totalEmployees}</div>
                <p className="leave-summary-trend">Total Karyawan</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Karyawan Aktif</p><p className="leave-summary-subtitle">Status bekerja</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-green"><UserCheck size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-green">{activeEmployees}</div>
                <p className="leave-summary-trend">Karyawan Aktif</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Masa Percobaan</p><p className="leave-summary-subtitle">Probation/Pending</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-orange"><UserPlus size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-orange">{probationEmployees}</div>
                <p className="leave-summary-trend">Masa Percobaan</p>
              </div>
              <div className="leave-summary-card">
                <div className="leave-summary-header">
                  <div><p className="leave-summary-label">Resigned / Non-Aktif</p><p className="leave-summary-subtitle">Riwayat keluar</p></div>
                  <div className="leave-summary-icon-wrapper leave-icon-red"><UserMinus size={28} /></div>
                </div>
                <div className="leave-summary-value leave-value-red">{inactiveEmployees}</div>
                <p className="leave-summary-trend">Non-Aktif</p>
              </div>
            </div>
          </>
        );

      case 'employee_dept':
        return (
          <>
            <h2 className="reports-chart-title"><BarChart3 size={16} /> Karyawan per Departemen</h2>
            <p className="reports-chart-subtitle">Distribusi headcount per unit</p>
            {deptHeadcount.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptHeadcount} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" horizontal={false} />
                  <XAxis type="number" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis dataKey="name" type="category" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} width={100} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(10, 122, 62,0.1)' }} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 8, 8, 0]} name="Headcount" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'employee_gender':
        return (
          <>
            <h2 className="reports-chart-title"><PieIcon size={16} /> Diversitas Gender</h2>
            <p className="reports-chart-subtitle">Proporsi Laki-laki dan Perempuan</p>
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {genderData.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'employee_status':
        return (
          <>
            <h2 className="reports-chart-title"><BarChart3 size={16} /> Status Kepegawaian</h2>
            <p className="reports-chart-subtitle">Distribusi status karyawan</p>
            {empStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={empStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(10, 122, 62,0.1)' }} />
                  <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} name="Jumlah" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      case 'employee_recruitment_trend':
        return (
          <>
            <h2 className="reports-chart-title"><TrendingUp size={16} /> Tren Karyawan Baru</h2>
            <p className="reports-chart-subtitle">Jumlah karyawan bergabung per bulan</p>
            {hiringTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={hiringTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="rgba(139,92,246,0.2)" strokeWidth={3} name="Karyawan Baru" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>}
          </>
        );

      default:
        return <div>Widget tidak dikenal: {widget.id}</div>;
    }
  }, [
    weeklyTrend, deptHeadcount, leaveTypeDist, payrollTimeline,
    attendanceRecords, monthlyTrend, attendanceStatusBreakdown, attendanceDept,
    pendingLeaves, approvedLeaves, rejectedLeaves, leaveMonthlyTrend, leaveDaysByType,
    paid, payrollStatusData, payrollDeptData,
    assetCategoryData, assetStatusData, assetValueData, assignDeptData,
    genderData, empStatusData, hiringTrend,
    totalEmployees, activeEmployees, probationEmployees, inactiveEmployees,
    present, absent, late,
    assets, activeAssets, assignedAssets, maintenanceAssets,
    leaveRecords,
  ]);

  if (loading) {
    return (
      <div className="reports-dashboard">
        <PageHeader
          title="Laporan & Analitik"
          subtitle="Memuat data dari seluruh modul..."
          badge={{ icon: BarChart3, label: "Pusat Laporan" }}
          scope
        />
      </div>
    );
  }

  return (
    <div className="reports-dashboard">
      <PageHeader
        title="Laporan & Analitik"
        subtitle="Dashboard terpusat laporan HR. Seret dan urutkan widget sesuai preferensi Anda."
        badge={{ icon: BarChart3, label: "Pusat Laporan" }}
        scope
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-outline" onClick={() => saveOrder(ALL_WIDGETS.map(w => w.id))} style={{ marginLeft: '8px' }}>
              <TrendingUp size={16} />
              Reset Urutan
            </button>
          </>
        }
      />

      {error && <p className="reports-error">{error}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
          <div className="reports-charts-grid reports-charts-grid--dnd">
            {activeWidgets.map(widget => (
              <SortableWidget key={widget.id} id={widget.id}>
                {renderWidget(widget)}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default ReportsDashboardPage;
