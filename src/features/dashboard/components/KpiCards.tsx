import React, { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Users, UserCheck, CalendarOff, Clock,TrendingDown, Target } from 'lucide-react';
import { api } from '@/shared/api/httpClient';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import { getEmployeeSummary } from '@/features/employee/api/employee.service';
import './KpiCards.css';

type KpiCardItem = {
  title: string;
  value: string;
  trend: string;
  icon: React.ComponentType<{ size?: number }>;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';
};

type UnknownRecord = Record<string, unknown>;

type KpiMetricItem = {
  score?: number | string;
};

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
  const root = toRecord(raw);
  
  // 1. Check if root.data is DIRECTLY a number (common for count/statistics APIs)
  const directDataValue = getNumericValue(root.data);
  if (directDataValue !== null) return directDataValue;

  // 2. Try Laravel Pagination Style (root.data.total or root.total)
  const dataNode = toRecord(root.data ?? root);
  const total = getNumericValue(dataNode.total) ?? getNumericValue(root.total) ?? getNumericValue(root.count);
  if (total !== null) return total;

  const payload = unwrapPayload(raw);

  // 3. If payload is direct array
  if (Array.isArray(payload)) {
    return payload.length;
  }

  // 4. Check inside payload record for arrays
  const payloadRecord = toRecord(payload);
  const arrayCandidates = [payloadRecord.items, payloadRecord.rows, payloadRecord.data, payloadRecord.results];

  for (const candidate of arrayCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.length;
    }
  }

  // 5. Last resort: any numeric value found in payload
  const numericCandidates = [
    payloadRecord.total,
    payloadRecord.count,
    payloadRecord.total_count,
    payloadRecord.totalCount,
  ];

  for (const candidate of numericCandidates) {
    const numericValue = getNumericValue(candidate);
    if (numericValue !== null) return numericValue;
  }

  return 0;
};

export const KpiCards: React.FC = () => {
  const [kpiData, setKpiData] = useState<KpiCardItem[]>([
    { title: 'Total Karyawan', value: '-', trend: 'Memuat...', icon: Users, color: 'blue' },
    { title: 'Hadir Hari Ini', value: '-', trend: 'Memuat...', icon: UserCheck, color: 'green' },
    { title: 'Cuti Menunggu', value: '-', trend: 'Memuat...', icon: CalendarOff, color: 'orange' },
    { title: 'Reimbursement', value: '-', trend: 'Memuat...', icon: Clock, color: 'red' },
    { title: 'Rata-rata KPI', value: '-', trend: 'Memuat...', icon: Target, color: 'purple' },
    { title: 'Tingkat Kehadiran', value: '-', trend: 'Memuat...', icon: TrendingDown, color: 'teal' },
  ]);

  const user = useAuthStore((state) => state.user);
  const presentationMode = Boolean(user && user.roles.length === 0 && user.permissions.length === 0);
  const canViewDashboardMetrics = presentationMode || RBACUtils.hasPermission(user, [
    PERMISSIONS.REPORTING_DASHBOARD,
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW_ALL,
    PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.REIMBURSEMENT_VIEW,
    PERMISSIONS.KPI_VIEW,
  ]);

  useEffect(() => {
    if (!canViewDashboardMetrics) return;

    const loadDashboardKpis = async () => {
      if (presentationMode) {
        const summary = await getEmployeeSummary();
        setKpiData([
          { title: 'Total Karyawan', value: String(summary.total), trend: 'Data SQL Server', icon: Users, color: 'blue' },
          { title: 'Karyawan Aktif', value: String(summary.active), trend: 'Status aktif dari database', icon: UserCheck, color: 'green' },
          { title: 'Departemen', value: String(summary.departments), trend: 'Departemen terdaftar', icon: CalendarOff, color: 'orange' },
          { title: 'Jabatan', value: String(summary.positions), trend: 'Jabatan terdaftar', icon: Clock, color: 'purple' },
        ]);
        return;
      }

      const [employees, attendanceToday, pendingLeaves, pendingReimbursements, kpisRes] =
        await Promise.allSettled([
          api.get('employees'),
          api.get('attendance/today'),
          api.get('leaves/pending'),
          api.get('reimbursements/pending'),
          api.get('kpis'),
        ]);

      const employeesCount = employees.status === 'fulfilled' ? getCountFromPayload(employees.value.data) : 0;
      const presentTodayCount =
        attendanceToday.status === 'fulfilled' ? getCountFromPayload(attendanceToday.value.data) : 0;
      const pendingLeavesCount =
        pendingLeaves.status === 'fulfilled' ? getCountFromPayload(pendingLeaves.value.data) : 0;
      const pendingReimbursementsCount =
        pendingReimbursements.status === 'fulfilled'
          ? getCountFromPayload(pendingReimbursements.value.data)
          : 0;
          
      const kpis = kpisRes.status === 'fulfilled' ? unwrapPayload(kpisRes.value.data) : [];
      const kpiPayload = toRecord(kpis);
      const kpiItems: KpiMetricItem[] = Array.isArray(kpis)
        ? kpis
        : Array.isArray(kpiPayload.data)
          ? (kpiPayload.data as KpiMetricItem[])
          : [];
          
      const avgKpiScore = kpiItems.length > 0
        ? kpiItems.reduce((acc, k) => acc + (Number(k.score) || 0), 0) / kpiItems.length
        : 0;

      const attendanceRate = employeesCount > 0 ? Math.round((presentTodayCount / employeesCount) * 100) : 0;

      setKpiData([
        {
          title: 'Total Karyawan',
          value: String(employeesCount),
          trend: 'Data karyawan tersimpan',
          icon: Users,
          color: 'blue',
        },
        {
          title: 'Hadir Hari Ini',
          value: String(presentTodayCount),
          trend: `${attendanceRate}% tingkat kehadiran`,
          icon: UserCheck,
          color: 'green',
        },
        {
          title: 'Cuti Menunggu',
          value: String(pendingLeavesCount),
          trend: 'Butuh persetujuan',
          icon: CalendarOff,
          color: 'orange',
        },
        {
          title: 'Reimbursement',
          value: String(pendingReimbursementsCount),
          trend: 'Butuh peninjauan',
          icon: Clock,
          color: 'red',
        },
        {
          title: 'Rata-rata KPI',
          value: `${avgKpiScore.toFixed(1)}%`,
          trend: `${kpiItems.length} rekaman KPI ditrack`,
          icon: Target,
          color: 'purple',
        },
        {
          title: 'Tingkat Kehadiran',
          value: `${attendanceRate}%`,
          trend: 'Berdasarkan kehadiran hari ini',
          icon: TrendingDown,
          color: 'teal',
        },
      ]);
    };

    void loadDashboardKpis();
  }, [canViewDashboardMetrics, presentationMode]);

  if (!canViewDashboardMetrics) {
    return null;
  }

  return (
    <div className="kpi-grid">
      {kpiData.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={idx} className="kpi-card" glass>
            <div className="kpi-content">
              <div className="kpi-info">
                <p className="kpi-title">{kpi.title}</p>
                <h3 className="kpi-value">{kpi.value}</h3>
              </div>
              <div className={`kpi-icon-wrapper color-${kpi.color}`}>
                <Icon size={28} />
              </div>
            </div>
            <p className="kpi-trend">{kpi.trend}</p>
          </Card>
        );
      })}
    </div>
  );
};
