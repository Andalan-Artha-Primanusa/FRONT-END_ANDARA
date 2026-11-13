import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/shared/ui/Card";
import { payrollService, toSafeArray } from "@/features/payroll/api/payroll.service";
import type { PayrollItem } from "@/features/payroll/types/payroll.types";
import {
  CheckCircle2,
  Clock3,
  FileText,
  ReceiptText,
  TrendingUp,
  RefreshCw,
  Wallet,
} from "lucide-react";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./PayrollListPage.css";
import "./PayrollShared.css";
import "./PayrollDashboard.css";
import { PageHeader } from "@/shared/ui";

const PayrollDashboard: React.FC = () => {
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [monthlyTrendData, setMonthlyTrendData] = useState<
    { month: string; totalPayroll: number; processed: number; pending: number }[]
  >([]);
  const [payrollStatusData, setPayrollStatusData] = useState<
    { name: string; value: number }[]
  >([]);
  const [departmentPayrollData, setDepartmentPayrollData] = useState<
    { name: string; amount: number }[]
  >([]);

  const [totalPayroll, setTotalPayroll] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [averagePayroll, setAveragePayroll] = useState(0);

  const statusColors = ["var(--color-primary)", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const loadPayrollData = async () => {
    setLoading(true);
    try {
      const payrollData = await payrollService.getPayrollList();
      const items = toSafeArray(payrollData);
      setPayrollItems(items);

      if (items.length > 0) {
        const total = items.length;
        const processed = items.filter((item: any) => item.status === "paid" || item.status === "approved").length;
        const pending = items.filter((item: any) => item.status === "pending" || !item.status).length;

        setTotalPayroll(total);
        setTotalProcessed(processed);
        setTotalPending(pending);

        const thpSum = items.reduce((sum, item: any) => sum + (Number(item.take_home_pay) || 0), 0);
        const periods = new Set(items.map((item: any) => item.period));
        const monthCount = Math.max(periods.size, 1);
        setAveragePayroll(Math.round(thpSum / monthCount));

        processChartData(items);
      }
    } catch (err) {
      console.error("Error loading payroll:", err);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (items: PayrollItem[]) => {
    const monthlyMap = new Map<string, { total: number; processed: number; pending: number }>();
    items.forEach((item: any) => {
      const month = item.period || "Unknown";
      const current = monthlyMap.get(month) || { total: 0, processed: 0, pending: 0 };
      current.total += 1;
      if (item.status === "paid" || item.status === "approved") {
        current.processed += 1;
      } else {
        current.pending += 1;
      }
      monthlyMap.set(month, current);
    });

    const monthlyArray = Array.from(monthlyMap, ([month, data]) => ({
      month,
      totalPayroll: data.total,
      processed: data.processed,
      pending: data.pending,
    })).sort((a, b) => a.month.localeCompare(b.month));

    setMonthlyTrendData(monthlyArray.slice(-8));

    const statusMap = new Map<string, number>();
    items.forEach((item: any) => {
      const status = String(item.status || "draft").toLowerCase();
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    setPayrollStatusData(
      Array.from(statusMap, ([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    );

    const departmentMap = new Map<string, number>();
    items.forEach((item: any) => {
      const dept = item.employee?.department || "Unknown";
      const amount = Number(item.take_home_pay || item.net_salary || 0);
      departmentMap.set(dept, (departmentMap.get(dept) || 0) + amount);
    });
    setDepartmentPayrollData(
      Array.from(departmentMap, ([name, amount]) => ({ name, amount }))
    );
  };

  const handleGenerateMonthly = async () => {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM format

    try {
      // Use generatePayroll with new API format
      await payrollService.generatePayroll({ period: period });
      // Reload data
      await loadPayrollData();
    } catch (err) {
      console.error("Error generating payroll:", err);
    }
  };

  useEffect(() => {
    void loadPayrollData();
  }, []);

  const formatCurrency = (value: number) => {
    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "#fff",
      border: "1px solid var(--color-primary-light)",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(10, 122, 62, 0.1)",
    },
    labelStyle: { color: "var(--color-primary-dark)", fontWeight: "bold" as const },
  };

  return (
    <div className="crud-page">
      {/* Header - Same style as Dashboard */}
      <PageHeader
        title="Dashboard Penggajian"
        subtitle="Pusat manajemen payroll perusahaan. Lacak tren, generate data bulanan, dan kelola slip gaji karyawan secara efisien dalam satu dasbor terpadu."
        badge={{ icon: Wallet, label: "Operasi Penggajian" }}
        actions={
          <button className="btn-outline" onClick={() => void loadPayrollData()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        }
      />

      {/* Summary Cards - Same style as Employees Page */}
      <div className="payroll-summary-wrapper">
        <div className="payroll-summary-card">
          <div className="payroll-summary-header">
            <div>
              <p className="payroll-summary-label">Total Record</p>
              <p className="payroll-summary-subtitle">Seluruh riwayat payroll</p>
            </div>
            <div className="payroll-summary-icon-wrapper payroll-icon-blue">
              <FileText size={28} />
            </div>
          </div>
          <div className="payroll-summary-value payroll-value-blue">{totalPayroll}</div>
          <p className="payroll-summary-trend">Seluruh Riwayat</p>
        </div>

        <div className="payroll-summary-card">
          <div className="payroll-summary-header">
            <div>
              <p className="payroll-summary-label">Selesai Diproses</p>
              <p className="payroll-summary-subtitle">Status paid/approved</p>
            </div>
            <div className="payroll-summary-icon-wrapper payroll-icon-green">
              <CheckCircle2 size={28} />
            </div>
          </div>
          <div className="payroll-summary-value payroll-value-green">{totalProcessed}</div>
          <p className="payroll-summary-trend">{totalPayroll > 0 ? `${((totalProcessed / totalPayroll) * 100).toFixed(1)}%` : "0%"} Tuntas</p>
        </div>

        <div className="payroll-summary-card">
          <div className="payroll-summary-header">
            <div>
              <p className="payroll-summary-label">Menunggu</p>
              <p className="payroll-summary-subtitle">Status pending/draft</p>
            </div>
            <div className="payroll-summary-icon-wrapper payroll-icon-orange">
              <Clock3 size={28} />
            </div>
          </div>
          <div className="payroll-summary-value payroll-value-orange">{totalPending}</div>
          <p className="payroll-summary-trend">Butuh Review</p>
        </div>

        <div className="payroll-summary-card">
          <div className="payroll-summary-header">
            <div>
              <p className="payroll-summary-label">Rata-rata / Bulan</p>
              <p className="payroll-summary-subtitle">Estimasi volume</p>
            </div>
            <div className="payroll-summary-icon-wrapper payroll-icon-purple">
              <TrendingUp size={28} />
            </div>
          </div>
          <div className="payroll-summary-value payroll-value-purple">{averagePayroll}</div>
          <p className="payroll-summary-trend">Estimasi Volume</p>
        </div>
      </div>

      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <ReceiptText size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Analitik Payroll</h2>
            <p className="analytics-subtitle">Ringkasan tren, status, dan distribusi biaya untuk evaluasi cepat</p>
          </div>
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="payroll-charts-grid">
        <Card className="crud-table-card payroll-chart-card">
          <h3 className="payroll-section-title">Tren Payroll Bulanan</h3>
          <p className="chart-subtitle">Volume payroll yang diproses per periode (8 periode terakhir)</p>
          {monthlyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="totalPayroll" name="Total" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="processed" name="Selesai" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pending" name="Menunggu" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">Belum ada data tren bulanan</div>
          )}
        </Card>

        <Card className="crud-table-card payroll-chart-card">
          <h3 className="payroll-section-title">Komposisi Status</h3>
          <p className="chart-subtitle">Distribusi status payroll saat ini</p>
          {payrollStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={payrollStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={102}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {payrollStatusData.map((_, index) => (
                    <Cell key={`status-cell-${index}`} fill={statusColors[index % statusColors.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(value: any) => `${value} record`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">Belum ada data status</div>
          )}
        </Card>

        <Card className="crud-table-card payroll-chart-card payroll-full-width-chart">
          <h3 className="payroll-section-title">Distribusi Gaji per Departemen</h3>
          <p className="chart-subtitle">Total kompensasi (Tunjangan + Bonus) per departemen</p>
          {departmentPayrollData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={departmentPayrollData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} tickFormatter={(v) => `Rp ${v/1000000}jt`} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => formatCurrency(Number(v))} />
                <Bar dataKey="amount" fill="var(--color-primary)" radius={[8, 8, 0, 0]} name="Total Payroll" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">Data departemen tidak ditemukan</div>
          )}
        </Card>
      </div>

    </div>
  );
};

export default PayrollDashboard;
