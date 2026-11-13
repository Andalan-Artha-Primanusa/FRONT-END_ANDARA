import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { api } from '@/shared/api/httpClient';
import { useAuthStore } from '@/app/store/auth.store';
import { FileText, Activity, CalendarDays, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { getMyLeaveBalance, getMyLeaves, getTodayAttendance, getAttendanceHistory } from '@/features/ess/api/ess.service';
import "./EmployeeDashboardPage.css";

type LeaveItem = {
  id: string | number;
  status: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  total_days?: number;
  created_at?: string;
};

type AttendanceRecord = {
  id: string | number;
  check_in_time?: string;
  check_out_time?: string;
  status?: string;
  date?: string;
};

type LeaveTypeData = { name: string; value: number };
type MonthlyLeaveData = { month: string; approved: number; pending: number; rejected: number };
type AttendanceTrendData = { day: string; present: number; absent: number };

const EmployeeDashboardPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [leaveBalance, setLeaveBalance] = useState<number>(0);
  const [leaveUsed, setLeaveUsed] = useState<number>(0);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveItem[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [allLeaves, setAllLeaves] = useState<LeaveItem[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrendData[]>([]);
  const [leaveTypeData, setLeaveTypeData] = useState<LeaveTypeData[]>([]);
  const [monthlyLeaveData, setMonthlyLeaveData] = useState<MonthlyLeaveData[]>([]);
  const [leaveStatusData, setLeaveStatusData] = useState<LeaveTypeData[]>([]);
  const [leaveDurationData, setLeaveDurationData] = useState<LeaveTypeData[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{ present: number; absent: number; rate: number }>({ present: 0, absent: 0, rate: 0 });
  const [yearlyLeaveData, setYearlyLeaveData] = useState<MonthlyLeaveData[]>([]);
  const [recentActivities, setRecentActivities] = useState<Array<{ type: string; desc: string; time: string; status: string }>>([]);

  const userName = user?.name || user?.email || 'Karyawan';
  const chartColors = ['var(--color-primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [balanceRes, leavesRes, attendanceRes, attendanceTrendRes] = await Promise.allSettled([
          getMyLeaveBalance(),
          getMyLeaves(),
          getTodayAttendance(),
          getAttendanceHistory(),
        ]);

        // Leave balance
        if (balanceRes.status === 'fulfilled') {
          const payload = balanceRes.value.payload as any;
          setLeaveBalance(payload?.balance?.available_days ?? payload?.remaining_days ?? payload?.balance ?? 0);
          setLeaveUsed(payload?.balance?.used_days ?? payload?.used_days ?? payload?.used ?? 0);
        }

        // Leaves
        let leaves: LeaveItem[] = [];
        if (leavesRes.status === 'fulfilled') {
          leaves = leavesRes.value.items as LeaveItem[];
          const pending = leaves.filter((l) => l.status === 'pending' || l.status === 'submitted');
          setPendingLeaves(pending);
          setAllLeaves(leaves);

          // Leave type distribution
          const typeMap = new Map<string, number>();
          leaves.forEach((l) => {
            const type = getLeaveTypeLabel(l.type);
            typeMap.set(type, (typeMap.get(type) || 0) + 1);
          });
          setLeaveTypeData(Array.from(typeMap, ([name, value]) => ({ name, value })));

          // Leave status distribution
          const statusMap = new Map<string, number>();
          leaves.forEach((l) => {
            const status = l.status === 'approved' ? 'Disetujui' : l.status === 'pending' || l.status === 'submitted' ? 'Pending' : 'Ditolak';
            statusMap.set(status, (statusMap.get(status) || 0) + 1);
          });
          setLeaveStatusData(Array.from(statusMap, ([name, value]) => ({ name, value })));

          // Leave duration distribution
          const durationMap = new Map<string, number>();
          leaves.forEach((l) => {
            const days = l.total_days || 1;
            const key = days === 1 ? '1 hari' : `${days} hari`;
            durationMap.set(key, (durationMap.get(key) || 0) + 1);
          });
          setLeaveDurationData(Array.from(durationMap, ([name, value]) => ({ name, value })));

          // Monthly leave trend (last 6 months)
          const monthMap = new Map<string, { approved: number; pending: number; rejected: number }>();
          const now = new Date();
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthMap.set(key, { approved: 0, pending: 0, rejected: 0 });
          }
          leaves.forEach((l) => {
            if (!l.created_at) return;
            const d = new Date(l.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const entry = monthMap.get(key);
            if (entry) {
              if (l.status === 'approved') entry.approved++;
              else if (l.status === 'pending' || l.status === 'submitted') entry.pending++;
              else if (l.status === 'rejected') entry.rejected++;
            }
          });
          setMonthlyLeaveData(
            Array.from(monthMap.entries()).map(([month, data]) => ({
              month: new Date(month + '-01').toLocaleDateString('id-ID', { month: 'short' }),
              ...data,
            }))
          );

          // Yearly leave trend (last 12 months)
          const yearMap = new Map<string, { approved: number; pending: number; rejected: number }>();
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            yearMap.set(key, { approved: 0, pending: 0, rejected: 0 });
          }
          leaves.forEach((l) => {
            if (!l.created_at) return;
            const d = new Date(l.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const entry = yearMap.get(key);
            if (entry) {
              if (l.status === 'approved') entry.approved++;
              else if (l.status === 'pending' || l.status === 'submitted') entry.pending++;
              else if (l.status === 'rejected') entry.rejected++;
            }
          });
          setYearlyLeaveData(
            Array.from(yearMap.entries()).map(([month, data]) => ({
              month: new Date(month + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
              ...data,
            }))
          );

          // Recent activities
          const activities = leaves.slice(0, 8).map((l) => ({
            type: 'leave',
            desc: `${getLeaveTypeLabel(l.type)} - ${l.total_days || 1} hari`,
            time: l.start_date ? new Date(l.start_date).toLocaleDateString('id-ID') : '-',
            status: l.status,
          }));
          setRecentActivities(activities);
        }

        // Today attendance
        if (attendanceRes.status === 'fulfilled') {
          const payload = attendanceRes.value.payload as any;
          if (payload && (payload.check_in_time || payload.status)) {
            setTodayAttendance(payload);
          }
        }

        // Attendance trend (last 7 days)
        if (attendanceTrendRes.status === 'fulfilled') {
          const records = attendanceTrendRes.value.items as any[];
          const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const trendData: AttendanceTrendData[] = dayOrder.map((day) => ({ day, present: 0, absent: 0 }));
          
          records.forEach((r: any) => {
            if (!r.date) return;
            const d = new Date(r.date);
            const dayName = dayOrder[d.getDay()];
            const entry = trendData.find((t) => t.day === dayName);
            if (entry) {
              if (r.check_in_time || r.status === 'present') entry.present++;
              else entry.absent++;
            }
          });
          setAttendanceTrend(trendData);

          // Attendance stats
          const present = records.filter((r: any) => r.check_in_time || r.status === 'present').length;
          const absent = records.length - present;
          const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
          setAttendanceStats({ present, absent, rate });
        }
      } catch (error) {
        console.error('Failed to load employee dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const summaryCards = useMemo(() => [
    {
      label: 'Saldo Cuti',
      value: loading ? '-' : `${leaveBalance} hari`,
      subtitle: `${leaveUsed} hari terpakai`,
      icon: <CalendarDays size={24} />,
      color: 'blue' as const,
    },
    {
      label: 'Cuti Pending',
      value: loading ? '-' : String(pendingLeaves.length),
      subtitle: 'Menunggu persetujuan',
      icon: <Clock size={24} />,
      color: 'orange' as const,
    },
    {
      label: 'Status Hari Ini',
      value: loading ? '-' : (todayAttendance ? 'Hadir' : 'Belum Check-in'),
      subtitle: todayAttendance ? new Date(todayAttendance.check_in_time || '').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Silakan check-in',
      icon: todayAttendance ? <CheckCircle2 size={24} /> : <XCircle size={24} />,
      color: todayAttendance ? 'green' as const : 'red' as const,
    },
    {
      label: 'Total Cuti',
      value: loading ? '-' : String(allLeaves.length),
      subtitle: 'Semua pengajuan',
      icon: <FileText size={24} />,
      color: 'purple' as const,
    },
  ], [loading, leaveBalance, leaveUsed, pendingLeaves.length, todayAttendance, allLeaves.length]);

  const getStatusClass = (status?: string) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return 'status-badge status-badge--approved';
    if (normalized === 'submitted' || normalized === 'pending') return 'status-badge status-badge--pending';
    if (normalized === 'rejected') return 'status-badge status-badge--draft';
    return 'status-badge status-badge--draft';
  };

  const getLeaveTypeLabel = (type: string | undefined) => {
    const typeMap: Record<string, string> = {
      annual: 'Cuti Tahunan',
      sick: 'Cuti Sakit',
      personal: 'Cuti Pribadi',
      unpaid: 'Cuti Tanpa Gaji',
    };
    return typeMap[type?.toLowerCase() ?? ''] ?? type ?? 'Lainnya';
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="crud-page">
      <PageHeader
        title={`Halo, ${user?.name?.split(' ')[0] || 'User'}!`}
        subtitle="Lihat ringkasan aktivitas dan status cuti Anda."
        badge={{ icon: Activity, label: "Dashboard Karyawan" }}
        actions={
          <>
            <button className="btn-primary" onClick={() => navigate('/leave/requests')}>
              Ajukan Cuti
            </button>
            <button className="btn-outline" onClick={() => navigate('/attendance/check-in')}>
              Check In
            </button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryCards.map((card) => {
          return (
            <div key={card.label} className="employee-summary-card">
              <div className="employee-summary-header">
                <div>
                  <p className="employee-summary-label">{card.label}</p>
                  <p className="employee-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`employee-summary-icon-wrapper employee-icon-${card.color}`}>
                  {card.icon}
                </div>
              </div>
              <div className={`employee-summary-value employee-value-${card.color}`}>{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1: Leave Balance & Leave Types */}
      <div className="charts-grid-2">
        {/* Leave Balance Chart */}
        <Card className="chart-card">
          <div className="chart-header">
            <div className="chart-title-area">
              <h3 className="chart-title">Saldo Cuti</h3>
              <p className="chart-subtitle">Sisa vs terpakai tahun ini</p>
            </div>
          </div>
          {loading ? (
            <div className="chart-empty">Memuat...</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Tersisa', value: leaveBalance },
                    { name: 'Terpakai', value: leaveUsed },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="var(--color-primary)" />
                  <Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Leave Types Distribution */}
        <Card className="chart-card">
          <div className="chart-header">
            <div className="chart-title-area">
              <h3 className="chart-title">Distribusi Jenis Cuti</h3>
              <p className="chart-subtitle">Semua pengajuan cuti Anda</p>
            </div>
          </div>
          {loading ? (
            <div className="chart-empty">Memuat...</div>
          ) : leaveTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={leaveTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {leaveTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">Belum ada data cuti</div>
          )}
        </Card>
      </div>

      {/* Monthly Leave Trend Chart */}
      <Card className="chart-card">
        <div className="chart-header">
          <div className="chart-title-area">
            <h3 className="chart-title">Tren Cuti Bulanan</h3>
            <p className="chart-subtitle">6 bulan terakhir</p>
          </div>
        </div>
        {loading ? (
          <div className="chart-empty">Memuat...</div>
        ) : monthlyLeaveData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyLeaveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="approved" fill="#10b981" radius={[4, 4, 0, 0]} name="Disetujui" />
              <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
              <Bar dataKey="rejected" fill="#ef4444" radius={[4, 4, 0, 0]} name="Ditolak" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Belum ada data cuti</div>
        )}
      </Card>

      {/* Yearly Leave Trend */}
      <Card className="chart-card">
        <div className="chart-header">
          <div className="chart-title-area">
            <h3 className="chart-title">Tren Cuti Tahunan</h3>
            <p className="chart-subtitle">12 bulan terakhir</p>
          </div>
        </div>
        {loading ? (
          <div className="chart-empty">Memuat...</div>
        ) : yearlyLeaveData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={yearlyLeaveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="approved" fill="#10b981" radius={[4, 4, 0, 0]} name="Disetujui" />
              <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
              <Bar dataKey="rejected" fill="#ef4444" radius={[4, 4, 0, 0]} name="Ditolak" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Belum ada data cuti</div>
        )}
      </Card>

      {/* Attendance Stats Summary */}
      <div className="charts-grid-2">
        <Card className="chart-card">
          <div className="chart-header">
            <div className="chart-title-area">
              <h3 className="chart-title">Ringkasan Kehadiran</h3>
              <p className="chart-subtitle">Statistik kehadiran Anda</p>
            </div>
          </div>
          {loading ? (
            <div className="chart-empty">Memuat...</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Hadir', value: attendanceStats.present },
                    { name: 'Tidak Hadir', value: attendanceStats.absent },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Leave Status Distribution */}
        <Card className="chart-card">
          <div className="chart-header">
            <div className="chart-title-area">
              <h3 className="chart-title">Status Pengajuan Cuti</h3>
              <p className="chart-subtitle">Distribusi status cuti Anda</p>
            </div>
          </div>
          {loading ? (
            <div className="chart-empty">Memuat...</div>
          ) : leaveStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={leaveStatusData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} name="Jumlah" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">Belum ada data cuti</div>
          )}
        </Card>
      </div>

      {/* Leave Duration Distribution */}
      <Card className="chart-card">
        <div className="chart-header">
          <div className="chart-title-area">
            <h3 className="chart-title">Durasi Cuti</h3>
            <p className="chart-subtitle">Distribusi lama cuti (hari)</p>
          </div>
        </div>
        {loading ? (
          <div className="chart-empty">Memuat...</div>
        ) : leaveDurationData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={leaveDurationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Jumlah" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Belum ada data cuti</div>
        )}
      </Card>

      {/* Attendance Trend Chart */}
      <Card className="chart-card">
        <div className="chart-header">
          <div className="chart-title-area">
            <h3 className="chart-title">Tren Kehadiran Mingguan</h3>
            <p className="chart-subtitle">Status kehadiran Anda</p>
          </div>
        </div>
        {loading ? (
          <div className="chart-empty">Memuat...</div>
        ) : attendanceTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={attendanceTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" name="Hadir" />
              <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAbsent)" name="Tidak Hadir" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Belum ada data kehadiran</div>
        )}
      </Card>

      {/* Recent Activity & Quick Actions */}
      <div className="charts-grid-2">
        {/* Recent Leave Requests */}
        <Card className="table-card">
          <div className="table-header-bar">
            <h3>Pengajuan Cuti Terbaru</h3>
            <button className="btn-outline" onClick={() => navigate('/leave/requests')}>
              Lihat Semua
            </button>
          </div>
          <div className="table-wrap">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Memuat...</div>
            ) : allLeaves.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                Belum ada pengajuan cuti
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tipe Cuti</th>
                    <th>Tanggal</th>
                    <th>Hari</th>
                    <th className="th-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allLeaves.slice(0, 5).map((item, index) => (
                    <tr key={String(item.id ?? index)}>
                      <td>
                        <span className="badge-soft badge-soft--blue">{getLeaveTypeLabel(item.type)}</span>
                      </td>
                      <td>
                        <div className="cell-stacked">
                          <span className="cell-stacked__main" style={{ fontSize: '0.85rem' }}>{formatDate(item.start_date)}</span>
                          <span className="cell-stacked__sub">hingga {formatDate(item.end_date)}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.total_days || 1} hari</span>
                      </td>
                      <td className="td-center">
                        <span className={getStatusClass(item.status)}>
                          {item.status === 'approved' ? 'Approved' :
                            item.status === 'submitted' || item.status === 'pending' ? 'Pending' : 'Rejected'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="analytics-title-card">
          <div className="analytics-title-inner">
            <div className="analytics-icon">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="analytics-title">Aksi Cepat</h2>
              <p className="analytics-subtitle">Akses fitur utama dengan cepat</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn-primary btn-full" onClick={() => navigate('/leave/requests')}>
              Ajukan Cuti Baru
            </button>
            <button className="btn-outline btn-full" onClick={() => navigate('/attendance/check-in')}>
              Check In / Check Out
            </button>
            <button className="btn-outline btn-full" onClick={() => navigate('/leave/balance')}>
              Lihat Saldo Cuti
            </button>
            <button className="btn-outline btn-full" onClick={() => navigate('/attendance/history')}>
              Riwayat Absensi
            </button>
            <button className="btn-outline btn-full" onClick={() => navigate('/my-payroll')}>
              Slip Gaji
            </button>
            <button className="btn-outline btn-full" onClick={() => navigate('/profile')}>
              Edit Profil
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
