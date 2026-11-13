import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ClipboardList, Users, Wallet, TrendingUp, Activity, Clock3, CheckCircle2 } from 'lucide-react';
import { KpiCards } from '@/features/dashboard/components/KpiCards';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { api } from '@/shared/api/httpClient';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import { getEmployeeSummary } from '@/features/employee/api/employee.service';
import "./OverviewPage.css";

type DashboardRecord = Record<string, unknown>;

type AttendanceTrendPoint = {
  day: string;
  present: number;
  absent: number;
};

type DepartmentPoint = {
  name: string;
  count: number;
};

type PayrollTrendPoint = {
  month: string;
  processed: number;
  pending: number;
};

type LeaveTypePoint = {
  name: string;
  value: number;
};

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toRecord = (value: unknown): DashboardRecord =>
  value && typeof value === 'object' ? (value as DashboardRecord) : {};

const extractPayload = (raw: unknown) => {
  const root = toRecord(raw);
  return root.data ?? raw;
};

const extractArrayPayload = (raw: unknown): DashboardRecord[] => {
  const payload = extractPayload(raw);

  if (Array.isArray(payload)) {
    return payload.filter((item): item is DashboardRecord => !!item && typeof item === 'object');
  }

  const payloadRecord = toRecord(payload);
  const candidates = [payloadRecord.items, payloadRecord.rows, payloadRecord.data, payloadRecord.results];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is DashboardRecord => !!item && typeof item === 'object');
    }
  }

  return [];
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

const getStringValue = (record: DashboardRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return '';
};

const getCountFromPayload = (raw: unknown): number => {
  const payload = extractPayload(raw);

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
  ];

  for (const candidate of numericCandidates) {
    const numericValue = getNumericValue(candidate);
    if (numericValue !== null) {
      return numericValue;
    }
  }

  return 0;
};

const getStatusText = (record: DashboardRecord) => {
  const status = getStringValue(record, ['status', 'attendance_status', 'state']);
  return status.toLowerCase();
};

const isPresentRecord = (record: DashboardRecord) => {
  const status = getStatusText(record);
  if (status.includes('present') || status.includes('hadir') || status.includes('approved') || status.includes('paid')) {
    return true;
  }

  if (status.includes('absent') || status.includes('late') || status.includes('terlambat') || status.includes('rejected')) {
    return false;
  }

  return Boolean(
    getStringValue(record, ['check_in', 'checkIn', 'clock_in', 'clockIn', 'present']).trim() ||
      getStringValue(record, ['date', 'attendance_date', 'created_at']).trim()
  );
};

const getWeekdayLabel = (record: DashboardRecord) => {
  const candidate =
    getStringValue(record, ['date', 'attendance_date', 'created_at', 'check_in', 'checkIn']) ||
    getStringValue(record, ['day']);

  if (!candidate) {
    return null;
  }

  const parsedDate = new Date(candidate);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleDateString('en-US', { weekday: 'short' });
};

const formatPeriodLabel = (period: string) => {
  if (!period) {
    return 'Unknown';
  }

  const parts = period.split('-');
  if (parts.length !== 2) {
    return period;
  }

  const [year, month] = parts;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) {
    return period;
  }

  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const allowedMenuKeys = useAuthStore((state) => state.allowedMenuKeys);
  const presentationMode = Boolean(user && user.roles.length === 0 && user.permissions.length === 0);
  const canViewAdminOverview =
    presentationMode || RBACUtils.hasPermission(user, "reporting.dashboard") ||
    allowedMenuKeys.some(
      (k) => k.startsWith("alat-admin") || k.startsWith("penggajian") || k.startsWith("laporan") || k.startsWith("manajemen-cuti")
    );
  const canLoadDetailedDashboardData = canViewAdminOverview;

  const [attendanceData, setAttendanceData] = useState<AttendanceTrendPoint[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentPoint[]>([]);
  const [leaveTypeData, setLeaveTypeData] = useState<LeaveTypePoint[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollTrendPoint[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [positionCount, setPositionCount] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingReimbursements, setPendingReimbursements] = useState(0);
  const [processedPayrollRate, setProcessedPayrollRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartColors = ['var(--color-primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const summaryCards = presentationMode ? [
    {
      label: 'Total Karyawan',
      subtitle: 'Data dari SQL Server',
      value: String(totalEmployees),
      change: 'ms_hr_employee',
      tone: 'blue' as const,
      icon: Users,
    },
    {
      label: 'Karyawan Aktif',
      subtitle: 'Status aktif dari database',
      value: String(activeEmployees),
      change: `${departmentCount} departemen`,
      tone: 'green' as const,
      icon: Users,
    },
    {
      label: 'Departemen',
      subtitle: 'Unit kerja terdaftar',
      value: String(departmentCount),
      change: 'Dari ms_hr_employee',
      tone: 'orange' as const,
      icon: ClipboardList,
    },
    {
      label: 'Jabatan',
      subtitle: 'Posisi terdaftar',
      value: String(positionCount),
      change: 'Dari PositionDesc',
      tone: 'purple' as const,
      icon: Wallet,
    },
  ] : [
    {
      label: 'Kehadiran Hari Ini',
      subtitle: 'Persentase kehadiran hari ini',
      value: `${totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0}%`,
      change: `${presentToday} hadir hari ini`,
      tone: 'blue' as const,
      icon: TrendingUp,
    },
    {
      label: 'Cuti Menunggu',
      subtitle: 'Menunggu persetujuan',
      value: String(pendingLeaves),
      change: 'Dari /leaves/pending',
      tone: 'orange' as const,
      icon: ClipboardList,
    },
    {
      label: 'Karyawan Aktif',
      subtitle: 'Karyawan aktif bulan ini',
      value: String(activeEmployees),
      change: `${totalEmployees} total karyawan`,
      tone: 'green' as const,
      icon: Users,
    },
    {
      label: 'Status Payroll',
      subtitle: 'Payroll bulan berjalan',
      value: `${processedPayrollRate}%`,
      change: `${payrollData.length} data payroll . ${pendingReimbursements} reimbursement menunggu`,
      tone: 'purple' as const,
      icon: Wallet,
    },
  ];

  useEffect(() => {
    if (!canViewAdminOverview) {
      setLoading(false);
      return;
    }

    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (presentationMode) {
          const summary = await getEmployeeSummary();
          setTotalEmployees(summary.total);
          setActiveEmployees(summary.active);
          setDepartmentCount(summary.departments);
          setPositionCount(summary.positions);
          setDepartmentData(summary.department_breakdown ?? []);
          setAttendanceData([]);
          setLeaveTypeData([]);
          setPayrollData([]);
          setPresentToday(0);
          setPendingLeaves(0);
          setPendingReimbursements(0);
          setProcessedPayrollRate(0);
          return;
        }

        const canViewPayroll = allowedMenuKeys.some((k) => k.startsWith("penggajian"));
        const canViewLeaves = RBACUtils.hasPermission(user, PERMISSIONS.LEAVE_VIEW);

        const promises = [
          api.get('/employees'),
          api.get('/attendance/all'),
          api.get('/leaves/pending'),
          api.get('/reimbursements/pending'),
          api.get('/attendance/today'),
        ];

        if (canViewPayroll) {
          promises.push(api.get('/payroll'));
        }

        if (canViewLeaves) {
          promises.push(api.get('/leaves'));
        }

        const results = await Promise.allSettled(promises);
        
        let cursor = 0;
        const employeesRes = results[cursor++];
        const attendanceRes = results[cursor++];
        const leavesPendingRes = results[cursor++];
        const reimbursementsRes = results[cursor++];
        const todayAttendanceRes = results[cursor++];
        const payrollRes = canViewPayroll ? results[cursor++] : null;
        const allLeavesRes = canViewLeaves ? results[cursor++] : null;

        const employees = employeesRes && employeesRes.status === 'fulfilled' ? extractArrayPayload(employeesRes.value.data) : [];
        const attendanceRecords = attendanceRes && attendanceRes.status === 'fulfilled' ? extractArrayPayload(attendanceRes.value.data) : [];
        const pendingLeaveRecords = leavesPendingRes && leavesPendingRes.status === 'fulfilled' ? extractArrayPayload(leavesPendingRes.value.data) : [];
        const pendingReimbursementRecords = reimbursementsRes && reimbursementsRes.status === 'fulfilled' ? extractArrayPayload(reimbursementsRes.value.data) : [];
        const todayAttendancePayload = todayAttendanceRes && todayAttendanceRes.status === 'fulfilled' ? extractPayload(todayAttendanceRes.value.data) : {};
        
        const payrollRecords = payrollRes && payrollRes.status === 'fulfilled' ? extractArrayPayload(payrollRes.value.data) : [];
        const allLeaves = allLeavesRes && allLeavesRes.status === 'fulfilled' ? extractArrayPayload(allLeavesRes.value.data) : [];

        setTotalEmployees(employees.length);
        setActiveEmployees(
          employees.filter((employee) => {
            const status = getStringValue(employee, ['status']).toLowerCase();
            return !status || status === 'active';
          }).length
        );

        const presentTodayCount = getCountFromPayload(todayAttendancePayload);
        setPresentToday(presentTodayCount);

        setPendingLeaves(pendingLeaveRecords.length);
        setPendingReimbursements(pendingReimbursementRecords.length);

        const processedPayrollCount = payrollRecords.filter((record) => {
          const status = getStringValue(record, ['status']).toLowerCase();
          return status === 'paid' || status === 'approved';
        }).length;
        setProcessedPayrollRate(
          payrollRecords.length > 0 ? Math.round((processedPayrollCount / payrollRecords.length) * 100) : 0
        );

        const attendanceAggregate = dayOrder.map((day) => ({ day, present: 0, absent: 0 }));
        attendanceRecords.forEach((record) => {
          const dayLabel = getWeekdayLabel(record);
          if (!dayLabel) return;

          const target = attendanceAggregate.find((item) => item.day === dayLabel);
          if (!target) return;

          if (isPresentRecord(record)) {
            target.present += 1;
          } else {
            target.absent += 1;
          }
        });
        setAttendanceData(attendanceAggregate);

        const departmentMap = new Map<string, number>();
        employees.forEach((employee) => {
          const department = getStringValue(employee, ['department', 'department_name', 'departmentName']) || 'Unassigned';
          departmentMap.set(department, (departmentMap.get(department) || 0) + 1);
        });
        setDepartmentData(Array.from(departmentMap, ([name, count]) => ({ name, count })));

        const leaveTypeMap = new Map<string, number>();
        allLeaves.forEach((leave) => {
          const type = getStringValue(leave, ['type', 'leave_type', 'leaveType']) || 'Unknown';
          leaveTypeMap.set(type, (leaveTypeMap.get(type) || 0) + 1);
        });
        setLeaveTypeData(Array.from(leaveTypeMap, ([name, value]) => ({ name, value })));

        const payrollMap = new Map<string, { processed: number; pending: number }>();
        payrollRecords.forEach((record) => {
          const period = getStringValue(record, ['period']) || 'Unknown';
          const current = payrollMap.get(period) || { processed: 0, pending: 0 };
          const status = getStringValue(record, ['status']).toLowerCase();

          if (status === 'paid' || status === 'approved') {
            current.processed += 1;
          } else {
            current.pending += 1;
          }

          payrollMap.set(period, current);
        });

        const payrollTimeline = Array.from(payrollMap.entries())
          .sort(([periodA], [periodB]) => periodA.localeCompare(periodB))
          .map(([period, value]) => ({
            month: formatPeriodLabel(period),
            processed: value.processed,
            pending: value.pending,
          }));

        setPayrollData(payrollTimeline);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, [canViewAdminOverview, user, allowedMenuKeys, presentationMode]);


  return (
    <div className="crud-page">
      <PageHeader
        title={`Good Morning, ${user?.name?.split(' ')[0] || 'HR Team'}!`}
        subtitle="Here's an overview of your workforce today."
        badge={{ icon: Activity, label: canViewAdminOverview ? 'Pusat Dashboard Admin' : 'Pusat Layanan Mandiri' }}
        scope
        actions={canViewAdminOverview ? (
          <>
            <button className="btn-outline" onClick={() => navigate('/admin/analytics/people')}>
              Lihat Analitik
            </button>
            <button className="btn-primary" onClick={() => navigate('/payroll/approve')}>
              Jalankan Payroll
            </button>
          </>
        ) : undefined}
      />

      {error && (
        <Card className="error-card">
          <p>{error}</p>
        </Card>
      )}

      {canViewAdminOverview && <KpiCards />}

      {/* Non-Admin / Employee & Manager Sections */}
      {!canViewAdminOverview && (
        <div className="summary-grid" style={{ marginTop: '2rem' }}>
          {/* Personal Leave Balance */}
          <Card className="metric-card" onClick={() => navigate('/leave/balance')} style={{ cursor: 'pointer' }}>
            <div className="metric-header">
              <div>
                <span className="metric-label">Saldo Cuti</span>
                <p className="metric-subtitle">Cuti tahunan tersedia</p>
              </div>
              <span className="metric-icon metric-icon--blue">
                <Wallet size={24} />
              </span>
            </div>
            <div className="metric-value">12 Hari</div>
            <div className="metric-change">
              <span style={{ color: 'var(--color-primary)' }}>Lihat rincian saldo</span>
            </div>
          </Card>

          {/* Pending Requests */}
          <Card className="metric-card" onClick={() => navigate('/leave/history')} style={{ cursor: 'pointer' }}>
            <div className="metric-header">
              <div>
                <span className="metric-label">Pengajuan Pending</span>
                <p className="metric-subtitle">Menunggu persetujuan</p>
              </div>
              <span className="metric-icon metric-icon--orange">
                <Clock3 size={24} />
              </span>
            </div>
            <div className="metric-value">{pendingLeaves + pendingReimbursements}</div>
            <div className="metric-change">
              <span>Cuti & Reimbursement</span>
            </div>
          </Card>

          {/* Presence Today */}
          <Card className="metric-card">
            <div className="metric-header">
              <div>
                <span className="metric-label">Status Kehadiran</span>
                <p className="metric-subtitle">Hari ini</p>
              </div>
              <span className="metric-icon metric-icon--green">
                <CheckCircle2 size={24} />
              </span>
            </div>
            <div className="metric-value">Hadir</div>
            <div className="metric-change">
              <span>Shift: 08:00 - 17:00</span>
            </div>
          </Card>
        </div>
      )}

      {/* Team Insight for Managers (If applicable) */}
      {!canViewAdminOverview && RBACUtils.hasPermission(user, [PERMISSIONS.TEAM_VIEW]) && (
        <>
          <Card className="analytics-title-card" style={{ marginTop: '2rem' }}>
            <div className="analytics-title-inner">
              <div className="analytics-icon">
                <Users size={24} />
              </div>
              <div>
                <h2 className="analytics-title">Insight Tim Saya</h2>
                <p className="analytics-subtitle">Pantau aktivitas anggota tim Anda</p>
              </div>
            </div>
          </Card>
          
          <div className="summary-grid">
             <Card className="metric-card">
                <div className="metric-header">
                  <div>
                    <span className="metric-label">Kehadiran Tim</span>
                    <p className="metric-subtitle">Anggota hadir hari ini</p>
                  </div>
                  <span className="metric-icon metric-icon--blue">
                    <Users size={24} />
                  </span>
                </div>
                <div className="metric-value">8 / 10</div>
                <div className="metric-change">
                  <span>2 Anggota absen</span>
                </div>
             </Card>
             <Card className="metric-card" onClick={() => navigate('/leave/approvals')} style={{ cursor: 'pointer' }}>
                <div className="metric-header">
                  <div>
                    <span className="metric-label">Persetujuan Tim</span>
                    <p className="metric-subtitle">Perlu tindakan Anda</p>
                  </div>
                  <span className="metric-icon metric-icon--orange">
                    <Activity size={24} />
                  </span>
                </div>
                <div className="metric-value">5</div>
                <div className="metric-change">
                  <span style={{ color: '#f59e0b' }}>Tinjau pengajuan</span>
                </div>
             </Card>
          </div>
        </>
      )}

      {canViewAdminOverview && (
        <>
          <div className="summary-grid">
            {summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <Card key={card.label} className="metric-card">
                  <div className="metric-header">
                    <div>
                      <span className="metric-label">{card.label}</span>
                      <p className="metric-subtitle">{card.subtitle}</p>
                    </div>
                    <span className={`metric-icon metric-icon--${card.tone}`}>
                      <Icon size={24} />
                    </span>
                  </div>
                  <div className="metric-value">{card.value}</div>
                  <div className="metric-change">
                    <span>{card.change}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="analytics-title-card">
            <div className="analytics-title-inner">
              <div className="analytics-icon">
                <BarChart3 size={24} />
              </div>
              <div>
                <h2 className="analytics-title">Dashboard Analitik</h2>
                <p className="analytics-subtitle">Data dan insight real-time</p>
              </div>
            </div>
          </Card>

          <div className="charts-section">
            <Card className="chart-card">
              <div className="chart-header">
                <div className="chart-title-area">
                  <h3 className="chart-title">Tren Kehadiran Mingguan</h3>
                  <p className="chart-subtitle">Pelacakan kehadiran karyawan minggu ini</p>
                </div>
              </div>
              {loading && attendanceData.length === 0 ? (
                <div className="chart-empty">Memuat data kehadiran...</div>
              ) : attendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={attendanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }}
                      labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="present" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" name="Hadir" />
                    <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAbsent)" name="Tidak Hadir" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Tidak ada data kehadiran.</div>
              )}
            </Card>

            <Card className="chart-card">
              <div className="chart-header">
                <div className="chart-title-area">
                  <h3 className="chart-title">Karyawan per Departemen</h3>
                  <p className="chart-subtitle">Distribusi total workforce</p>
                </div>
              </div>
              {loading && departmentData.length === 0 ? (
                <div className="chart-empty">Memuat data departemen...</div>
              ) : departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={departmentData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }}
                      labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                      cursor={{ fill: 'rgba(10, 122, 62, 0.05)' }}
                    />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[8, 8, 0, 0]} name="Jumlah Karyawan" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Tidak ada data departemen.</div>
              )}
            </Card>

            <Card className="chart-card">
              <div className="chart-header">
                <div className="chart-title-area">
                  <h3 className="chart-title">Status Payroll</h3>
                  <p className="chart-subtitle">Tingkat penyelesaian payroll bulanan</p>
                </div>
              </div>
              {loading && payrollData.length === 0 ? (
                <div className="chart-empty">Memuat data payroll...</div>
              ) : payrollData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={payrollData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }}
                      labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                      cursor={{ fill: 'rgba(10, 122, 62, 0.05)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="processed" stackId="a" fill="#10b981" radius={[8, 8, 0, 0]} name="Selesai" />
                    <Bar dataKey="pending" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} name="Menunggu" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Tidak ada data payroll.</div>
              )}
            </Card>

            <Card className="chart-card">
              <div className="chart-header">
                <div className="chart-title-area">
                  <h3 className="chart-title">Distribusi Jenis Cuti</h3>
                  <p className="chart-subtitle">Pengajuan cuti berdasarkan jenis</p>
                </div>
              </div>
              {loading && leaveTypeData.length === 0 ? (
                <div className="chart-empty">Memuat data cuti...</div>
              ) : leaveTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }}
                      labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Pie
                      data={leaveTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={90}
                      fill="var(--color-primary)"
                      dataKey="value"
                    >
                      {leaveTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Tidak ada data cuti.</div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default OverviewPage;
