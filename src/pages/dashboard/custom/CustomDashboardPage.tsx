import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  FileClock,
  GraduationCap,
  LayoutDashboard,
  ReceiptText,
  Save,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { showToast } from "@/shared/ui/toast";
import { companyService, type Company } from "@/features/company/api/company.service";
import { dashboardConfigService, type DashboardConfig, type DashboardWidget } from "@/features/dashboard/api/dashboard-config.service";
import { api } from "@/shared/api/httpClient";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import "../overview/OverviewPage.css";
import "./CustomDashboardPage.css";

const defaultConfig: DashboardConfig = {
  name: "Dashboard Saya",
  scope: "self",
  company_id: null,
  layout_json: [
    { key: "headcount", size: "md" },
    { key: "attendance_today", size: "md" },
    { key: "pending_leave", size: "md" },
    { key: "payroll_cost", size: "md" },
  ],
  filters_json: { period: "month" },
  is_default: true,
};

type MetricItem = {
  value: string;
  subtitle: string;
  trend: string;
};

type ChartPoint = {
  name: string;
  value: number;
  secondary?: number;
};

const fallbackWidgets: DashboardWidget[] = [
  { key: "headcount", label: "Headcount", required_permission: PERMISSIONS.EMPLOYEE_VIEW },
  { key: "attendance_today", label: "Attendance Today", required_permission: PERMISSIONS.REPORTING_ATTENDANCE },
  { key: "pending_leave", label: "Pending Leave", required_permission: PERMISSIONS.LEAVE_APPROVE },
  { key: "payroll_cost", label: "Payroll Cost", required_permission: PERMISSIONS.REPORTING_PAYROLL },
  { key: "reimbursement_cost", label: "Reimbursement Cost", required_permission: PERMISSIONS.REIMBURSEMENT_VIEW },
  { key: "kpi_summary", label: "KPI Summary", required_permission: PERMISSIONS.KPI_VIEW },
  { key: "training_summary", label: "Training Summary", required_permission: PERMISSIONS.TRAINING_VIEW },
  { key: "compliance_risk", label: "Compliance Risk", required_permission: PERMISSIONS.COMPLIANCE_VIEW },
];

const metricMeta = {
  headcount: { icon: Users, tone: "teal", label: "Headcount" },
  attendance_today: { icon: CalendarCheck, tone: "blue", label: "Attendance Today" },
  pending_leave: { icon: FileClock, tone: "amber", label: "Pending Leave" },
  payroll_cost: { icon: Wallet, tone: "emerald", label: "Payroll Cost" },
  reimbursement_cost: { icon: ReceiptText, tone: "rose", label: "Reimbursement Cost" },
  kpi_summary: { icon: TrendingUp, tone: "violet", label: "KPI Summary" },
  training_summary: { icon: GraduationCap, tone: "cyan", label: "Training Summary" },
  compliance_risk: { icon: AlertTriangle, tone: "orange", label: "Compliance Risk" },
} as const;

const toSafeArray = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const candidates = [raw.data, raw.items, raw.rows, raw.results, raw.payload];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
      if (candidate && typeof candidate === "object") {
        const nested = [candidate.data, candidate.items, candidate.rows, candidate.results];
        const found = nested.find(Array.isArray);
        if (found) return found;
      }
    }
  }
  return [];
};

const countPayload = (raw: any) => {
  const list = toSafeArray(raw);
  if (list.length) return list.length;
  return Number(raw?.data?.total ?? raw?.total ?? raw?.meta?.total ?? 0);
};

const formatCurrency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

const getMonthLabel = (raw: any) => {
  const value = raw?.hire_date ?? raw?.join_date ?? raw?.created_at ?? raw?.period ?? raw?.date;
  if (!value) return "Tanpa tanggal";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7) || "Tanpa tanggal";
  return date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
};

const getStatusLabel = (raw: any) => {
  const value = String(raw?.status ?? raw?.request_status ?? "draft").trim().toLowerCase();
  if (!value) return "Draft";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const toCountSeries = (rows: any[], getKey: (row: any) => string, limit = 6): ChartPoint[] => {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = getKey(row);
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map, ([name, value]) => ({ name, value })).slice(-limit);
};

const CustomDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const canAllCompany = RBACUtils.hasPermission(user, "dashboard.view_all_company");
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [configs, setConfigs] = useState<DashboardConfig[]>([]);
  const [config, setConfig] = useState<DashboardConfig>(defaultConfig);
  const [metrics, setMetrics] = useState<Record<string, MetricItem>>({});
  const [chartData, setChartData] = useState<Record<string, ChartPoint[]>>({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedWidgetKeys = useMemo(() => new Set(config.layout_json?.map((widget) => widget.key) ?? []), [config.layout_json]);
  const availableWidgets = widgets.length ? widgets : fallbackWidgets;

  useEffect(() => {
    const load = async () => {
      try {
        const [widgetData, companyData, configData] = await Promise.all([
          dashboardConfigService.widgets(),
          companyService.list().catch(() => []),
          dashboardConfigService.list().catch(() => []),
        ]);
        setWidgets(widgetData.length ? widgetData : fallbackWidgets);
        setCompanies(companyData);
        setConfigs(configData);
        const activeConfig = configData.find((item) => item.is_default) ?? configData[0];
        if (activeConfig) {
          setConfig({
            ...defaultConfig,
            ...activeConfig,
            layout_json: activeConfig.layout_json?.length ? activeConfig.layout_json : defaultConfig.layout_json,
          });
        }
      } catch (error: any) {
        setWidgets(fallbackWidgets);
        showToast(error.response?.data?.message || "Gagal memuat custom dashboard", "error");
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      setMetricsLoading(true);
      const [
        employees,
        attendanceToday,
        attendanceAll,
        pendingLeaves,
        payroll,
        reimbursements,
        kpis,
        trainings,
      ] = await Promise.allSettled([
        api.get("employees", { params: { per_page: 100 } }),
        api.get("attendance/today"),
        api.get("attendance/all", { params: { per_page: 100 } }),
        api.get("leaves/pending"),
        api.get("payroll", { params: { per_page: 100 } }),
        api.get("reimbursements/pending"),
        api.get("kpis", { params: { per_page: 100 } }),
        api.get("training/programs", { params: { per_page: 100 } }),
      ]);

      const employeeTotal = employees.status === "fulfilled" ? countPayload(employees.value.data) : 0;
      const employeeRows = employees.status === "fulfilled" ? toSafeArray(employees.value.data) : [];
      const attendancePayload = attendanceToday.status === "fulfilled" ? attendanceToday.value.data?.data ?? attendanceToday.value.data : null;
      const attendanceRows = attendanceAll.status === "fulfilled" ? toSafeArray(attendanceAll.value.data) : [];
      const presentToday = attendanceRows.filter((item) => Boolean(item.check_in || item.check_in_time || item.clock_in)).length;
      const leaveRows = pendingLeaves.status === "fulfilled" ? toSafeArray(pendingLeaves.value.data) : [];
      const payrollRows = payroll.status === "fulfilled" ? toSafeArray(payroll.value.data) : [];
      const reimbursementRows = reimbursements.status === "fulfilled" ? toSafeArray(reimbursements.value.data) : [];
      const kpiRows = kpis.status === "fulfilled" ? toSafeArray(kpis.value.data) : [];
      const trainingRows = trainings.status === "fulfilled" ? toSafeArray(trainings.value.data) : [];
      const payrollCost = payrollRows.reduce((sum, item) => sum + Number(item.take_home_pay ?? item.net_salary ?? item.amount ?? 0), 0);
      const reimbursementCost = reimbursementRows.reduce((sum, item) => sum + Number(item.amount ?? item.total_amount ?? 0), 0);
      const approvalQueue = [
        { name: "Cuti", value: leaveRows.length },
        { name: "Reimburse", value: reimbursementRows.length },
      ].filter((item) => item.value > 0);

      setChartData({
        hiring: toCountSeries(employeeRows, getMonthLabel, 8),
        payrollStatus: toCountSeries(payrollRows, getStatusLabel, 6),
        approvalQueue,
      });

      setMetrics({
        headcount: {
          value: String(employeeTotal),
          subtitle: "Karyawan terdaftar",
          trend: employees.status === "fulfilled" ? "Data employee aktif" : "Endpoint employee belum tersedia",
        },
        attendance_today: {
          value: attendancePayload?.status ? String(attendancePayload.status) : String(presentToday),
          subtitle: attendancePayload?.check_in_time || attendancePayload?.check_in ? "Sudah check-in" : "Kehadiran hari ini",
          trend: attendanceAll.status === "fulfilled" || attendanceToday.status === "fulfilled" ? "Sinkron attendance" : "Endpoint attendance belum tersedia",
        },
        pending_leave: {
          value: String(leaveRows.length),
          subtitle: "Pengajuan menunggu approval",
          trend: pendingLeaves.status === "fulfilled" ? "Butuh tindak lanjut" : "Endpoint leave belum tersedia",
        },
        payroll_cost: {
          value: formatCurrency(payrollCost),
          subtitle: `${payrollRows.length} payroll records`,
          trend: payroll.status === "fulfilled" ? "Akumulasi take home pay" : "Endpoint payroll belum tersedia",
        },
        reimbursement_cost: {
          value: formatCurrency(reimbursementCost),
          subtitle: `${reimbursementRows.length} reimbursement pending`,
          trend: reimbursements.status === "fulfilled" ? "Nominal pending" : "Endpoint reimbursement belum tersedia",
        },
        kpi_summary: {
          value: String(kpiRows.length),
          subtitle: "KPI tersimpan",
          trend: kpis.status === "fulfilled" ? "Ringkasan KPI" : "Endpoint KPI belum tersedia",
        },
        training_summary: {
          value: String(trainingRows.length),
          subtitle: "Program training",
          trend: trainings.status === "fulfilled" ? "Ringkasan training" : "Endpoint training belum tersedia",
        },
        compliance_risk: {
          value: "0",
          subtitle: "Risiko compliance terbuka",
          trend: "Belum ada endpoint compliance aktif",
        },
      });
      setMetricsLoading(false);
    };

    void loadMetrics();
  }, []);

  const chartCards = [
    {
      key: "hiring",
      title: "Tren Karyawan Baru",
      subtitle: "Jumlah karyawan bergabung per bulan",
      type: "bar",
      data: chartData.hiring ?? [],
    },
    {
      key: "payrollStatus",
      title: "Status Payroll",
      subtitle: "Distribusi status payroll di company aktif",
      type: "pie",
      data: chartData.payrollStatus ?? [],
    },
    {
      key: "approvalQueue",
      title: "Antrean Approval",
      subtitle: "Item yang masih perlu diproses",
      type: "bar",
      data: chartData.approvalQueue ?? [],
    },
  ];

  const renderChart = (card: (typeof chartCards)[number]) => {
    if (metricsLoading) {
      return <div className="dashboard-chart-empty">Memuat grafik...</div>;
    }

    if (!card.data.length) {
      return <div className="dashboard-chart-empty">Belum ada data grafik untuk company aktif ini.</div>;
    }

    if (card.type === "pie") {
      const colors = ["var(--color-primary)", "#10b981", "#f59e0b", "#0ea5e9", "#ef4444", "#64748b"];
      return (
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie data={card.data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={3}>
              {card.data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={card.data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.14)" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const toggleWidget = (widget: DashboardWidget) => {
    setConfig((current) => {
      const layout = current.layout_json ?? [];
      const exists = layout.some((item) => item.key === widget.key);
      return {
        ...current,
        layout_json: exists
          ? layout.filter((item) => item.key !== widget.key)
          : [...layout, { key: widget.key, size: "md" }],
      };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await dashboardConfigService.save(config);
      setConfig({ ...config, ...saved });
      showToast("Custom dashboard tersimpan", "success");
    } catch (error: any) {
      showToast(error.response?.data?.message || "Gagal menyimpan dashboard", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="crud-page custom-dashboard-page">
      <PageHeader
        title="Dashboard Builder"
        subtitle="Pilih widget, scope company, dan filter default sesuai role."
        badge={{ icon: LayoutDashboard, label: "Custom Dashboard" }}
        scope
        actions={
          <Button variant="primary" size="md" onClick={save} disabled={saving}>
            <Save size={16} />
            {saving ? "Menyimpan..." : "Simpan Dashboard"}
          </Button>
        }
      />

      <div className="custom-dashboard-grid">
        <Card className="dashboard-settings-panel">
          <div className="settings-title">
            <SlidersHorizontal size={18} />
            <h2>Pengaturan</h2>
          </div>
          <label>Nama dashboard
            <input value={config.name} onChange={(event) => setConfig((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>Scope data
            <select value={config.scope} onChange={(event) => setConfig((current) => ({ ...current, scope: event.target.value as DashboardConfig["scope"] }))}>
              <option value="self">Data pribadi</option>
              <option value="company">Satu company</option>
              {canAllCompany && <option value="all_companies">All Companies</option>}
            </select>
          </label>
          <label>Company
            <select
              value={config.company_id ?? ""}
              onChange={(event) => setConfig((current) => ({ ...current, company_id: event.target.value ? Number(event.target.value) : null }))}
              disabled={config.scope !== "company"}
            >
              <option value="">Pilih company</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label>
          <label>Periode default
            <select
              value={(config.filters_json?.period as string) ?? "month"}
              onChange={(event) => setConfig((current) => ({ ...current, filters_json: { ...current.filters_json, period: event.target.value } }))}
            >
              <option value="today">Hari ini</option>
              <option value="week">Minggu ini</option>
              <option value="month">Bulan ini</option>
              <option value="quarter">Kuartal ini</option>
            </select>
          </label>
          {configs.length > 0 && <p className="saved-count">{configs.length} konfigurasi tersimpan</p>}
        </Card>

        <Card className="widget-picker-panel">
          <div className="settings-title">
            <LayoutDashboard size={18} />
            <h2>Widget</h2>
          </div>
          <div className="widget-list">
            {availableWidgets.map((widget) => (
              <button
                key={widget.key}
                className={`widget-choice ${selectedWidgetKeys.has(widget.key) ? "selected" : ""}`}
                onClick={() => toggleWidget(widget)}
              >
                <strong>{widget.label}</strong>
                <small>{widget.required_permission}</small>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <section className="dashboard-preview-grid">
        {(config.layout_json ?? []).map((item) => {
          const widget = availableWidgets.find((entry) => entry.key === item.key);
          const meta = metricMeta[item.key as keyof typeof metricMeta] ?? { icon: BarChart3, tone: "teal", label: widget?.label ?? item.key };
          const Icon = meta.icon;
          const metric = metrics[item.key];
          return (
            <Card key={item.key} className={`dashboard-preview-widget dashboard-preview-widget--${meta.tone}`}>
              <div className="dashboard-preview-widget__header">
                <span>{widget?.label ?? meta.label}</span>
                <div className="dashboard-preview-widget__icon">
                  <Icon size={20} />
                </div>
              </div>
              <strong>{metricsLoading ? "Memuat..." : metric?.value ?? "-"}</strong>
              <small>{metric?.subtitle ?? "Belum ada data"}</small>
              <p>{metric?.trend ?? `Scope: ${config.scope === "all_companies" ? "All Companies" : config.scope === "company" ? "Company" : "Self"}`}</p>
            </Card>
          );
        })}
        {(config.layout_json ?? []).length === 0 && (
          <Card className="dashboard-empty-preview">Pilih widget untuk membentuk dashboard.</Card>
        )}
      </section>

      <section className="dashboard-chart-grid">
        {chartCards.map((card) => (
          <Card key={card.key} className="dashboard-chart-card">
            <div className="dashboard-chart-card__header">
              <div>
                <h2>{card.title}</h2>
                <p>{card.subtitle}</p>
              </div>
              <BarChart3 size={18} />
            </div>
            {renderChart(card)}
          </Card>
        ))}
      </section>
    </div>
  );
};

export default CustomDashboardPage;
