import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Clock, TrendingUp, Users, RefreshCw, Activity, CheckCircle, XCircle, CalendarDays } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { api } from '@/shared/api/httpClient';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import './ReportsDashboardPage.css';

type Rec = Record<string, unknown>;

const toRec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
const extractPayload = (raw: unknown) => { const r = toRec(raw); return r.data ?? raw; };
const extractArr = (raw: unknown): Rec[] => {
  const p = extractPayload(raw);
  if (Array.isArray(p)) return p.filter((i): i is Rec => !!i && typeof i === 'object');
  const r = toRec(p);
  for (const k of ['items', 'rows', 'data', 'results']) { if (Array.isArray(r[k])) return (r[k] as unknown[]).filter((i): i is Rec => !!i && typeof i === 'object'); }
  return [];
};
const getStr = (rec: Rec, keys: string[]): string => { for (const k of keys) { const v = rec[k]; if (typeof v === 'string' && v.trim()) return v.trim(); } return ''; };

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const chartColors = ['var(--color-primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const tooltipStyle = {
  contentStyle: { backgroundColor: '#fff', border: '1px solid var(--color-primary-light)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(10, 122, 62,0.1)' },
  labelStyle: { color: 'var(--color-primary-dark)', fontWeight: 'bold' as const },
};

const ReportsAttendancePage: React.FC = () => {
  const [records, setRecords] = useState<Rec[]>([]);
  const [employees, setEmployees] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const allowedMenuKeys = useAuthStore((state) => state.allowedMenuKeys);

  const canViewAttendanceReports = useMemo(() => {
    const hasPerm = RBACUtils.hasPermission(user, [PERMISSIONS.REPORTING_ATTENDANCE, PERMISSIONS.ATTENDANCE_VIEW_ALL]);
    const hasMenuAccess = allowedMenuKeys.includes("laporan.absensi") || allowedMenuKeys.includes("attendance.reports");
    return Boolean(hasPerm || hasMenuAccess);
  }, [user, allowedMenuKeys]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      if (!canViewAttendanceReports) {
        setRecords([]);
        setEmployees([]);
        setError('Anda tidak memiliki akses untuk melihat laporan absensi.');
        return;
      }

      const [attRes, empRes] = await Promise.allSettled([api.get('/attendance/all'), api.get('/employees')]);
      const attendanceData = attRes.status === 'fulfilled' ? extractArr(attRes.value.data) : [];
      const employeeData = empRes.status === 'fulfilled' ? extractArr(empRes.value.data) : [];

      if (attendanceData.length === 0 && attRes.status === 'rejected') {
        throw attRes.reason;
      }

      setRecords(attendanceData);
      setEmployees(employeeData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
      setRecords([]);
      setEmployees([]);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [canViewAttendanceReports]);

  const totalEmployees = employees.length;

  const present = useMemo(() => records.filter(r => {
    const s = getStr(r, ['status', 'attendance_status']).toLowerCase();
    return s.includes('present') || s.includes('hadir') || (!s.includes('absent') && !s.includes('late') && getStr(r, ['check_in', 'checkIn']));
  }).length, [records]);

  const absent = useMemo(() => records.filter(r => {
    const s = getStr(r, ['status', 'attendance_status']).toLowerCase();
    return s.includes('absent') || s.includes('alpa');
  }).length, [records]);

  const late = useMemo(() => records.filter(r => {
    const s = getStr(r, ['status', 'attendance_status']).toLowerCase();
    return s.includes('late') || s.includes('terlambat');
  }).length, [records]);

  // Weekly trend
  const weeklyTrend = useMemo(() => {
    const agg = dayOrder.map(day => ({ day, hadir: 0, absen: 0, terlambat: 0 }));
    records.forEach(r => {
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
  }, [records]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { hadir: number; absen: number }>();
    records.forEach(r => {
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
  }, [records]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      const s = getStr(r, ['status', 'attendance_status']) || 'Unknown';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [records]);

  // Dept attendance
  const deptAttendance = useMemo(() => {
    const deptMap = new Map<string, { hadir: number; total: number }>();
    employees.forEach(e => {
      const dept = getStr(e, ['department', 'department_name']) || 'Unassigned';
      const cur = deptMap.get(dept) || { hadir: 0, total: 0 };
      cur.total++;
      deptMap.set(dept, cur);
    });
    records.forEach(r => {
      const dept = getStr(r, ['department', 'department_name']) || 'Unassigned';
      if (deptMap.has(dept)) {
        const s = getStr(r, ['status', 'attendance_status']).toLowerCase();
        if (!s.includes('absent') && !s.includes('alpa')) {
          deptMap.get(dept)!.hadir++;
        }
      }
    });
    return Array.from(deptMap, ([name, v]) => ({ name, hadir: v.hadir, total: v.total }));
  }, [employees, records]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _metrics = [
    { label: 'Total Catatan Absensi', sub: 'Semua records', value: String(records.length), tone: 'blue', icon: Activity },
    { label: 'Total Hadir', sub: `${totalEmployees > 0 ? Math.round((present / Math.max(records.length, 1)) * 100) : 0}% dari catatan`, value: String(present), tone: 'green', icon: CheckCircle },
    { label: 'Total Absen', sub: 'Tidak hadir', value: String(absent), tone: 'red', icon: XCircle },
    { label: 'Terlambat', sub: 'Late check-in', value: String(late), tone: 'orange', icon: Clock },
    { label: 'Total Karyawan', sub: 'Terdaftar di sistem', value: String(totalEmployees), tone: 'purple', icon: Users },
    { label: 'Rata-rata Kehadiran', sub: 'Per hari (estimasi)', value: `${records.length > 0 ? Math.round(present / Math.max(weeklyTrend.filter(d => d.hadir > 0).length, 1)) : 0}`, tone: 'cyan', icon: TrendingUp },
  ];

  return (
    <div className="reports-dashboard">
      <PageHeader
        title="Laporan Absensi"
        subtitle="Analisis kehadiran, ketidakhadiran, dan keterlambatan karyawan secara visual."
        badge={{ icon: CalendarDays, label: "Laporan & Analitik" }}
        actions={
          <button className="btn-outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        }
      />

      {error && <p className="reports-error">{error}</p>}

      <div className="leave-requests-wrapper">
        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Total Catatan</p>
              <p className="leave-summary-subtitle">Semua records</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-blue">
              <Activity size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-blue">{records.length}</div>
          <p className="leave-summary-trend">Total Absensi</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Hadir</p>
              <p className="leave-summary-subtitle">Total hadir</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-green">
              <CheckCircle size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-green">{present}</div>
          <p className="leave-summary-trend">Hadir</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Absen</p>
              <p className="leave-summary-subtitle">Tidak hadir</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-red">
              <XCircle size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-red">{absent}</div>
          <p className="leave-summary-trend">Absen</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Terlambat</p>
              <p className="leave-summary-subtitle">Late check-in</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-orange">
              <Clock size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-orange">{late}</div>
          <p className="leave-summary-trend">Terlambat</p>
        </div>
      </div>

      <div className="reports-charts-section">
        <div className="reports-charts-grid">
          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><BarChart3 size={16} /> Tren Absensi Mingguan</h2>
            <p className="reports-chart-subtitle">Hadir, absen, dan terlambat per hari dalam seminggu</p>
            {weeklyTrend.some(d => d.hadir > 0 || d.absen > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={weeklyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gHadir" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gAbsen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gLate" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="day" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="hadir" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gHadir)" name="Hadir" />
                  <Area type="monotone" dataKey="absen" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#gAbsen)" name="Absen" />
                  <Area type="monotone" dataKey="terlambat" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#gLate)" name="Terlambat" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (<div className="reports-chart-empty">{loading ? 'Memuat...' : 'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><TrendingUp size={16} /> Tren Absensi Bulanan</h2>
            <p className="reports-chart-subtitle">Perbandingan hadir vs absen per bulan</p>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="month" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="hadir" fill="#10b981" radius={[6, 6, 0, 0]} name="Hadir" />
                  <Bar dataKey="absen" fill="#ef4444" radius={[6, 6, 0, 0]} name="Absen" />
                </BarChart>
              </ResponsiveContainer>
            ) : (<div className="reports-chart-empty">{loading ? 'Memuat...' : 'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><Activity size={16} /> Breakdown Status Absensi</h2>
            <p className="reports-chart-subtitle">Proporsi status kehadiran seluruh records</p>
            {statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (<div className="reports-chart-empty">{loading ? 'Memuat...' : 'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><Users size={16} /> Absensi per Departemen</h2>
            <p className="reports-chart-subtitle">Total kehadiran berdasarkan departemen</p>
            {deptAttendance.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptAttendance} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" />
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-primary-dark)" style={{ fontSize: '12px' }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(10, 122, 62,0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="hadir" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="Hadir" />
                  <Bar dataKey="total" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="Total Karyawan" />
                </BarChart>
              </ResponsiveContainer>
            ) : (<div className="reports-chart-empty">{loading ? 'Memuat...' : 'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsAttendancePage;
