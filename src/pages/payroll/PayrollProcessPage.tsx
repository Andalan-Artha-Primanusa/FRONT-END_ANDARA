import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, CheckCircle2, RefreshCw, Zap, Clock, Wallet, LayoutDashboard, ChevronLeft, ChevronRight, AlertCircle, ShieldCheck, CreditCard, Eye, FileCheck, DollarSign, FileText, Search } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Modal } from "@/shared/ui/Modal";
import { showToast } from "@/shared/ui/toast";

import { Button } from "@/shared/ui/Button";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import { PayrollStatusBadge } from "@/shared/ui/PayrollStatusBadge";
import { payrollService, toSafeArray } from "@/features/payroll/api/payroll.service";
import { getAllEmployees } from "@/features/employee/api/employee.service";
import type { PayrollItem } from "@/features/payroll/types/payroll.types";
import type { EmployeeItem } from "@/features/employee/types/employee.types";
import { parsePaginatedResponse } from "@/shared/api/pagination";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./PayrollListPage.css";
import "./PayrollApprovePage.css";
import "./PayrollProcessPage.css";
import { PageHeader } from "@/shared/ui";

const formatCurrency = (v: unknown) => {
  const num = typeof v === "string" ? parseFloat(v) : Number(v);
  if (isNaN(num)) return "Rp 0";
  return `Rp ${num.toLocaleString("id-ID")}`;
};

const MONTHS = [
  { value: "01", label: "Januari" }, { value: "02", label: "Februari" },
  { value: "03", label: "Maret" }, { value: "04", label: "April" },
  { value: "05", label: "Mei" }, { value: "06", label: "Juni" },
  { value: "07", label: "Juli" }, { value: "08", label: "Agustus" },
  { value: "09", label: "September" }, { value: "10", label: "Oktober" },
  { value: "11", label: "November" }, { value: "12", label: "Desember" },
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const TABS = [
  {
    key: "generate",
    label: "Generate Payroll",
    icon: Zap,
    title: "Generate Payroll",
    subtitle: "Buat batch payroll bulanan untuk karyawan aktif pada periode yang dipilih.",
  },
  {
    key: "approve",
    label: "Persetujuan",
    icon: ShieldCheck,
    title: "Persetujuan Payroll",
    subtitle: "Review payroll draft, lanjutkan approval manager dan HR, atau tolak dengan catatan.",
  },
  {
    key: "payment",
    label: "Pembayaran",
    icon: CreditCard,
    title: "Pembayaran Payroll",
    subtitle: "Proses payroll yang sudah approved menjadi paid, termasuk pembayaran massal per periode.",
  },
];

type TabKey = "generate" | "approve" | "payment";

type PayrollProcessPageProps = {
  mode?: TabKey;
  showTabs?: boolean;
};

const PayrollProcessPage = ({ mode, showTabs = true }: PayrollProcessPageProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>(mode ?? "generate");
  const activeMeta = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];

  useEffect(() => {
    if (mode) setActiveTab(mode);
  }, [mode]);

  return (
    <div className="crud-page payroll-process-page">
      <PageHeader
        title={mode ? activeMeta.title : "Proses Payroll"}
        subtitle={mode ? activeMeta.subtitle : "Mulai dari generate payroll bulanan, approval manager dan HR, sampai pembayaran final."}
        badge={{ icon: activeMeta.icon, label: "Operasi Penggajian" }}
        scope
      />

      {showTabs && (
        <div className="payroll-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as TabKey)}
                className={`payroll-tab ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "generate" && <GenerateTab />}
      {activeTab === "approve" && <ApproveTab />}
      {activeTab === "payment" && <PaymentTab />}
    </div>
  );
};

/* ═══════════════════════════════ GENERATE TAB ═══════════════════════════ */
const GenerateTab = () => {
  const user = useAuthStore((state) => state.user);
  const canGenerate = RBACUtils.hasPermission(user, PERMISSIONS.PAYROLL_GENERATE);
  const now = new Date();
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [generateTotalPages, setGenerateTotalPages] = useState(1);
  const period = `${selectedYear}-${selectedMonth}`;

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const payrollResp = await payrollService.getPayrollList({ page: currentPage, per_page: pageSize });
      const parsed = parsePaginatedResponse<PayrollItem>(payrollResp);
      setItems(parsed.items.length ? parsed.items : toSafeArray(payrollResp));
      setGenerateTotalPages(parsed.totalPages);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal memuat", "error");
    } finally {
      setLoading(false);
    }
  };
  const generateMonthly = async () => {
    if (!period.trim()) { showToast("Pilih periode", "error"); return; }
    setLoading(true);
    try {
      await payrollService.generatePayroll({ period });
      showToast(`Payroll berhasil dibuat untuk ${period}`, "success");
      await loadPayroll();
    } catch (err) { showToast(err instanceof Error ? err.message : "Gagal", "error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadPayroll(); }, [currentPage]);

  const summaryCards = useMemo(() => {
    const paid = items.filter(i => String(i.status).toLowerCase() === "paid").length;
    const pending = items.filter(i => ["pending", "draft"].includes(String(i.status).toLowerCase())).length;
    const total = items.reduce((s, i) => s + (Number(i.take_home_pay) || 0), 0);
    return [
      { label: "Total Payroll", subtitle: "Semua data", value: String(items.length), change: `${formatCurrency(total)} total`, tone: "blue", icon: LayoutDashboard },
      { label: "Draft / Pending", subtitle: "Menunggu proses", value: String(pending), change: "Perlu approval", tone: "orange", icon: Clock },
      { label: "Sudah Dibayar", subtitle: "Batch selesai", value: String(paid), change: "Pembayaran selesai", tone: "green", icon: Wallet },
      { label: "Periode Aktif", subtitle: "Target", value: period, change: "Fokus operasional", tone: "purple", icon: CalendarDays },
    ];
  }, [items, period]);

  const filtered = useMemo(() => items.filter(it => {
    const s = String(it.status).toLowerCase();
    return (paymentFilter === "all" ? true : paymentFilter === "paid" ? s === "paid" : s !== "paid") &&
      (yearFilter === "all" || String(it.period ?? "").startsWith(yearFilter));
  }), [items, paymentFilter, yearFilter]);

  const [totalPages, setTotalPages] = useState(1);
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered;

  const columns = [
    { key: "id", label: "ID" }, { key: "employee_id", label: "Karyawan" }, { key: "period", label: "Periode" },
    { key: "basic_salary", label: "Gaji Pokok" }, { key: "allowance", label: "Tunjangan" },
    { key: "bonus", label: "Bonus" }, { key: "total_deduction", label: "Potongan" },
    { key: "take_home_pay", label: "Gaji Bersih" }, { key: "status", label: "Status" },
  ];

  return (
    <>
      <div className="payroll-summary-grid">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="payroll-summary-card" style={{ borderTopColor: "var(--color-primary)" }}>
              <p className="label">{c.label}</p>
              <p className="subtitle">{c.subtitle}</p>
              <div className="value-row">
                <div className="value" style={{ color: "var(--color-primary)" }}>{c.value}</div>
                <div className="icon-box">
                  <Icon size={22} />
                </div>
              </div>
              <p className="change-text">{c.change}</p>
            </div>
          );
        })}
      </div>

      <div className="payroll-config-grid">
        <Card className="payroll-table-card">
          <p className="payroll-section-title">
            <Zap size={15} color="#6366f1" /> Konfigurasi Batch
          </p>
          <label style={{ display: "block", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>Tahun</span>
            <select style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'Poppins', sans-serif", color: "#1e293b" }} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </label>
          <label style={{ display: "block", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>Bulan</span>
            <select style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'Poppins', sans-serif", color: "#1e293b" }} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Periode terpilih</span>
          <div className="period-box" style={{ padding: "10px 12px", borderRadius: 10, fontSize: 15, fontWeight: 800, textAlign: "center", marginBottom: "1rem" }}>{period}</div>
          <hr style={{ border: "none", borderTop: "1px solid var(--border-color, #f1f5f9)", margin: "1.25rem 0" }} />
          <div className="info-box" style={{ display: "flex", gap: 10, borderRadius: 10, padding: 12, marginBottom: "1.25rem" }}>
            <AlertCircle size={15} className="info-icon" style={{ flexShrink: 0, marginTop: 1 }} />
            <p className="info-text" style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>Kalkulasi tunjangan, bonus, dan potongan untuk <strong>semua karyawan aktif</strong> di periode {period}.</p>
          </div>
          {canGenerate && (
          <button onClick={() => void generateMonthly()} disabled={loading}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", background: "linear-gradient(135deg, var(--hero-bg-start), var(--hero-bg-end))", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Poppins', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
            {loading ? "Memproses..." : "Generate Payroll Sekarang"}
          </button>
          )}
        </Card>

        <Card className="crud-table-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: "1rem", flexWrap: "wrap" }}>
            <p className="list-title" style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart3 size={15} color="#6366f1" /> Daftar Payroll <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 4 }}>({filtered.length} records)</span>
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <select className="sort-select" style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, fontFamily: "'Poppins', sans-serif" }} value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}>
                <option value="all">Semua Tahun</option>
                {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
              {(["all", "paid", "unpaid"] as const).map(f => (
                <button key={f} onClick={() => { setPaymentFilter(f); setCurrentPage(1); }}
                  className={`filter-btn ${paymentFilter === f ? 'active' : ''}`}
                  style={{ padding: "5px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
                  {f === "all" ? "Semua" : f === "paid" ? "Dibayar" : "Tertunda"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#cbd5e1", fontSize: 13 }}>
              <RefreshCw size={20} className="animate-spin" style={{ display: "block", margin: "0 auto 8px", color: "#6366f1" }} />
              Memuat data...
            </div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#cbd5e1", fontSize: 13 }}>Tidak ada data payroll.</div>
          ) : (
            <div className="crud-table-wrap">
              <table className="crud-table">
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col.key} className={["basic_salary", "allowance", "bonus", "total_deduction", "take_home_pay"].includes(col.key) ? "text-right" : "text-left"} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((item, idx) => {
                    const emp = (item as any).employee as Record<string, any> | undefined;
                    return (
                      <tr key={String(item.id ?? idx)}>
                        {columns.map(col => {
                          const val = (item as any)[col.key];
                          if (col.key === "id") return <td key={col.key} style={{ padding: "11px 12px", verticalAlign: "middle" }}><span className="crud-table-id">#{String(val ?? "").padStart(3, "0")}</span></td>;
                          if (col.key === "employee_id") return <td key={col.key} style={{ padding: "11px 12px", verticalAlign: "middle" }}><span className="crud-table-name" style={{ fontWeight: 600 }}>{emp?.user?.name ?? `EMP-${String(val).padStart(3, "0")}`}</span></td>;
                          if (col.key === "period") return <td key={col.key} style={{ padding: "11px 12px", verticalAlign: "middle" }}><span className="crud-table-tag">{String(val ?? "-")}</span></td>;
                          if (["basic_salary", "allowance", "bonus", "total_deduction", "take_home_pay"].includes(col.key)) {
                            const isTotal = col.key === "take_home_pay";
                            return <td key={col.key} className="text-right" style={{ padding: "11px 12px", verticalAlign: "middle" }}><span className={isTotal ? "crud-table-amount-green" : "crud-table-amount"} style={col.key === "total_deduction" ? {color: "#f43f5e"} : {}}>{formatCurrency(val)}</span></td>;
                          }
                          if (col.key === "status") return <td key={col.key} style={{ padding: "11px 12px", verticalAlign: "middle" }}><PayrollStatusBadge status={String(val) as any} size="sm" /></td>;
                          return <td key={col.key} style={{ padding: "11px 12px", verticalAlign: "middle" }}><span>{String(val ?? "-")}</span></td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="table-pagination">
              <div className="pagination-info">
                {filtered.length === 0
                  ? 'Menampilkan 0 data'
                  : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filtered.length)} dari ${filtered.length} data`}
              </div>
              <div className="pagination-controls">
                <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                ))}
                <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>›</button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

/* ═══════════════════════════════ APPROVE TAB ═══════════════════════════ */
const ApproveTab = () => {
  const user = useAuthStore((state) => state.user);
  const canApprove = RBACUtils.hasPermission(user, PERMISSIONS.PAYROLL_APPROVE);
  const [payrolls, setPayrolls] = useState<PayrollItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [currentPagePending, setCurrentPagePending] = useState(1);
  const pageSizePending = 10;
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollItem | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const loadData = async () => {
    setLoading(true);
    try {
      const [payrollData, employeeData] = await Promise.all([payrollService.getPayrollList(), getAllEmployees()]);
      setPayrolls(toSafeArray(payrollData));
      setEmployees(toSafeArray(employeeData));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal memuat", "error");
    } finally { setLoading(false); }
  };
  useEffect(() => { void loadData(); }, []);

  const getEmpName = (empId: string | number) => {
    const emp = employees.find((e) => e.id === empId || String(e.id) === String(empId));
    return emp ? `${emp.employee_code} - ${emp.user?.name || "Unknown"}` : "Unknown";
  };

  const handleApprove = async () => {
    if (!canApprove) {
      showToast("Anda tidak memiliki izin menyetujui payroll", "error");
      return;
    }
    if (!selectedPayroll) { showToast("Pilih payroll terlebih dahulu", "error"); return; }
    if (selectedPayroll.status === "approved" || selectedPayroll.status === "paid") {
      showToast(`Status saat ini: ${selectedPayroll.status}`, "error"); return;
    }
    if (selectedPayroll.status === "rejected") { showToast("Payroll ini sudah ditolak.", "error"); return; }
    setLoading(true);
    try {
      if (selectedPayroll.status === "draft") {
        await payrollService.managerApprovePayroll(String(selectedPayroll.id));
        showToast(`Payroll #${selectedPayroll.id} disetujui Manajer — menunggu HR`, "success");
      } else if (selectedPayroll.status === "pending_hr") {
        await payrollService.hrApprovePayroll(String(selectedPayroll.id));
        showToast(`Payroll #${selectedPayroll.id} disetujui HR — siap dibayar`, "success");
      } else {
        await payrollService.approvePayroll(String(selectedPayroll.id));
        showToast(`Payroll #${selectedPayroll.id} berhasil disetujui`, "success");
      }
      setSelectedPayroll(null);
      await loadData();
    } catch (err) { showToast(err instanceof Error ? err.message : "Gagal menyetujui", "error"); }
    finally { setLoading(false); }
  };

  const handleReject = () => {
    if (!canApprove) {
      showToast("Anda tidak memiliki izin menolak payroll", "error");
      return;
    }
    if (!selectedPayroll) { showToast("Pilih payroll", "error"); return; }
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!selectedPayroll) return;
    if (!canApprove) {
      showToast("Anda tidak memiliki izin menolak payroll", "error");
      return;
    }
    if (!rejectReason.trim()) { showToast("Alasan penolakan wajib diisi", "error"); return; }
    setLoading(true);
    try {
      await payrollService.rejectPayroll(String(selectedPayroll.id), rejectReason);
      showToast(`Payroll #${selectedPayroll.id} ditolak`, "success");
      setRejectModalOpen(false);
      setSelectedPayroll(null);
      await loadData();
    } catch (err) { showToast(err instanceof Error ? err.message : "Gagal", "error"); }
    finally { setLoading(false); }
  };

  const safePayrolls = Array.isArray(payrolls) ? payrolls : [];
  const filteredPayrolls = safePayrolls.filter(p => {
    if (paymentFilter === 'all') return true;
    if (paymentFilter === 'paid') return String(p.status).toLowerCase() === 'paid';
    return String(p.status).toLowerCase() !== 'paid';
  });
  const pendingPayrolls = filteredPayrolls.filter(p =>
    String(p.status) === "draft" || String(p.status) === "pending_hr" || String(p.status) === "pending"
  );
  const otherPayrolls = filteredPayrolls.filter(p => p.status === "approved" || p.status === "paid");
  const rejectedPayrolls = filteredPayrolls.filter(p => p.status === "rejected");
  const totalPagesPending = Math.max(1, Math.ceil(pendingPayrolls.length / pageSizePending));
  const safePagePending = Math.min(currentPagePending, totalPagesPending);
  const paginatedPending = pendingPayrolls.slice((safePagePending - 1) * pageSizePending, safePagePending * pageSizePending);

  const summaryCards = [
    { label: "Draft (Manager)", subtitle: "Menunggu approve manager", value: String(filteredPayrolls.filter(p => p.status === "draft").length), change: "Step 1", tone: "orange" as const, icon: Clock },
    { label: "Pending HR", subtitle: "Menunggu final approval HR", value: String(filteredPayrolls.filter(p => p.status === "pending_hr").length), change: "Step 2", tone: "blue" as const, icon: ShieldCheck },
    { label: "Approved", subtitle: "Sudah disetujui", value: String(otherPayrolls.filter(p => p.status === "approved").length), change: "Siap dibayar", tone: "green" as const, icon: CheckCircle2 },
    { label: "Paid", subtitle: "Sudah dibayar", value: String(otherPayrolls.filter(p => p.status === "paid").length), change: "Selesai", tone: "purple" as const, icon: CreditCard },
  ];

  return (
    <>
      <div className="payroll-summary-wrapper">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="payroll-summary-card">
              <div className="payroll-summary-header">
                <div><p className="payroll-summary-label">{c.label}</p></div>
                <div className={`payroll-summary-icon-wrapper payroll-icon-${c.tone}`}><Icon size={28} /></div>
              </div>
              <div className={`payroll-summary-value payroll-value-${c.tone}`}>{c.value}</div>
            </div>
          );
        })}
      </div>

      <Card className="data-table-card">
        <div className="data-table-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h3 className="data-table-title">Menunggu Persetujuan <span className="data-table-count">{pendingPayrolls.length} payroll</span></h3>
            <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as any); setCurrentPagePending(1); }} className="sort-select">
              <option value="all">Semua Status</option>
              <option value="unpaid">Belum Dibayar</option>
              <option value="paid">Sudah Dibayar</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Karyawan</th><th>Periode</th><th className="text-right">Gaji Pokok</th>
                <th className="text-right">Gaji Bersih</th><th className="text-center">Status</th><th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPending.map((p) => (
                <tr key={p.id} className={selectedPayroll?.id === p.id ? "is-selected" : ""}>
                  <td className="crud-table-name">
                    <div className="crud-table-avatar">{getEmpName(p.employee_id).charAt(0)}</div>
                    <span>{getEmpName(p.employee_id)}</span>
                  </td>
                  <td><span className="crud-table-tag">{p.period}</span></td>
                  <td className="crud-table-amount">Rp {Number(p.basic_salary || 0).toLocaleString("id-ID")}</td>
                  <td className="crud-table-amount crud-table-amount-green">Rp {Number(p.take_home_pay || p.net_salary || 0).toLocaleString("id-ID")}</td>
                  <td><PayrollStatusBadge status={p.status || 'pending'} size="sm" /></td>
                  <td className="text-center">
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <button onClick={() => setSelectedPayroll(p)} className="action-btn action-btn-edit" title="Lihat"><Eye size={14} /></button>
                      {canApprove && (
                      <button onClick={() => setSelectedPayroll(p)} className="action-btn action-btn-success" title="Approve"><FileCheck size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pendingPayrolls.length > pageSizePending && (
          <div className="table-pagination">
            <div className="pagination-info">
              {pendingPayrolls.length === 0
                ? 'Menampilkan 0 data'
                : `Menampilkan ${(safePagePending - 1) * pageSizePending + 1}-${Math.min(safePagePending * pageSizePending, pendingPayrolls.length)} dari ${pendingPayrolls.length} data`}
            </div>
            <div className="pagination-controls">
              <button className="pagination-btn" onClick={() => setCurrentPagePending(Math.max(1, safePagePending - 1))} disabled={safePagePending === 1}>‹</button>
              {Array.from({ length: totalPagesPending }, (_, i) => i + 1).map((page) => (
                <button key={page} className={`pagination-btn ${safePagePending === page ? 'active' : ''}`} onClick={() => setCurrentPagePending(page)}>{page}</button>
              ))}
              <button className="pagination-btn" onClick={() => setCurrentPagePending(Math.min(totalPagesPending, safePagePending + 1))} disabled={safePagePending === totalPagesPending}>›</button>
            </div>
          </div>
        )}
      </Card>

      {otherPayrolls.length > 0 && (
        <>
          <Card className="analytics-title-card" style={{ marginTop: "1.5rem" }}>
            <div className="analytics-title-inner">
              <div className="analytics-icon"><CheckCircle2 size={24} /></div>
              <div><h2 className="analytics-title">Telah Disetujui</h2><p className="analytics-subtitle">{otherPayrolls.length} payroll</p></div>
            </div>
          </Card>
          <Card className="crud-table-card">
            <div className="crud-table-wrap">
              <table className="crud-table">
                <thead>
                  <tr>
                    <th>Karyawan</th><th>Periode</th><th className="text-right">Gaji Bersih</th><th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {otherPayrolls.map((p) => (
                    <tr key={p.id}>
                      <td className="crud-table-name"><div className="crud-table-avatar">{getEmpName(p.employee_id).charAt(0)}</div><span>{getEmpName(p.employee_id)}</span></td>
                      <td><span className="crud-table-tag">{p.period}</span></td>
                      <td className="crud-table-amount crud-table-amount-green">Rp {Number(p.take_home_pay || p.net_salary || 0).toLocaleString("id-ID")}</td>
                      <td><PayrollStatusBadge status={p.status || 'approved'} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Reject Modal — dengan textarea profesional */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Tolak Payroll" size="md">
        {selectedPayroll && (
          <div style={{ padding: "8px 0" }}>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.875rem", color: "#991b1b" }}>
              Payroll <strong>#{selectedPayroll.id}</strong> — {String(selectedPayroll.period)}
            </div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Alasan Penolakan <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              rows={4}
              style={{ width: "100%", padding: "0.75rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.875rem", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <Button variant="outline" size="md" onClick={() => setRejectModalOpen(false)} disabled={loading}>Batal</Button>
              {canApprove && (
              <Button variant="danger" size="md" onClick={() => void confirmReject()} disabled={loading || !rejectReason.trim()}>
                Tolak Payroll
              </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!selectedPayroll && !rejectModalOpen} onClose={() => setSelectedPayroll(null)} title={`Konfirmasi Payroll #${selectedPayroll?.id}`} size="lg">
        {selectedPayroll && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Karyawan</p>
                <p style={{ fontWeight: 600, color: "#1e293b", margin: "0 0 1rem" }}>{getEmpName(selectedPayroll.employee_id)}</p>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Periode</p>
                <p style={{ fontWeight: 600, color: "#1e293b", margin: "0 0 1rem" }}>{selectedPayroll.period}</p>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Status</p>
                <p style={{ margin: "0 0 1rem" }}><PayrollStatusBadge status={selectedPayroll.status} size="sm" /></p>
              </div>
              <div>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Gaji Pokok</p>
                <p style={{ fontWeight: 600, color: "#10b981", margin: "0 0 1rem" }}>Rp {Number(selectedPayroll.basic_salary || 0).toLocaleString("id-ID")}</p>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Gaji Bersih</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#10b981", margin: 0 }}>Rp {Number(selectedPayroll.take_home_pay || selectedPayroll.net_salary || 0).toLocaleString("id-ID")}</p>
              </div>
            </div>
            <div style={{ marginTop: "2rem", display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <Button variant="outline" size="md" onClick={() => setSelectedPayroll(null)} disabled={loading}>Batal</Button>
              {canApprove && (
              <Button variant="danger" size="md" onClick={() => handleReject()} disabled={loading}>Tolak</Button>
              )}
              {canApprove && (
              <Button variant="success" size="md" onClick={() => void handleApprove()} disabled={loading || (String(selectedPayroll.status) !== "draft" && String(selectedPayroll.status) !== "pending_hr" && String(selectedPayroll.status) !== "pending")}>
                {String(selectedPayroll.status) === "draft" ? "Manager Approve" : String(selectedPayroll.status) === "pending_hr" ? "HR Final Approve" : "Setujui Payroll"}
              </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

/* ═══════════════════════════════ PAYMENT TAB ═══════════════════════════ */
const PaymentTab = () => {
  const user = useAuthStore((state) => state.user);
  const canPay = RBACUtils.hasPermission(user, PERMISSIONS.PAYROLL_PAY);
  const [payrollId, setPayrollId] = useState("");
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollItem | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [allPayrolls, setAllPayrolls] = useState<PayrollItem[]>([]);
  const [currentPageRecent, setCurrentPageRecent] = useState(1);
  const pageSizeRecent = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [loading, setLoading] = useState(false);
  const [bulkPeriod, setBulkPeriod] = useState("");
  const [bulkPayModal, setBulkPayModal] = useState(false);
  const [bulkPayLoading, setBulkPayLoading] = useState(false);
  useEffect(() => {
    const loadData = async () => {
      try {
        const [emps, pays] = await Promise.all([getAllEmployees(), payrollService.getPayrollList()]);
        setEmployees(toSafeArray(emps));
        setAllPayrolls(toSafeArray(pays));
      } catch (err) { console.error(err); }
    };
    void loadData();
  }, []);

  const handleMarkAsPaid = async () => {
    if (!canPay) {
      showToast("Anda tidak memiliki izin melakukan pembayaran payroll", "error");
      return;
    }
    if (!selectedPayroll) { showToast("Pilih payroll", "error"); return; }
    if (selectedPayroll.status === "paid") { showToast("Payroll ini sudah dibayar.", "error"); return; }
    if (selectedPayroll.status !== "approved") {
      showToast(`Hanya payroll berstatus sudah disetujui yang bisa ditandai dibayar. Status saat ini: ${selectedPayroll.status}`, "error");
      return;
    }
    setLoading(true);
    try {
      await payrollService.processPayment(String(selectedPayroll.id));
      showToast(`Payroll #${selectedPayroll.id} berhasil ditandai dibayar`, "success");
      setSelectedPayroll(null);
      setAllPayrolls(toSafeArray(await payrollService.getPayrollList()));
    } catch (err) { showToast(err instanceof Error ? err.message : "Gagal", "error"); }
    finally { setLoading(false); }
  };

  const handleBulkPay = async () => {
    if (!canPay) {
      showToast("Anda tidak memiliki izin melakukan pembayaran payroll", "error");
      return;
    }
    if (!bulkPeriod) { showToast("Pilih periode terlebih dahulu", "error"); return; }
    setBulkPayLoading(true);
    try {
      const result = await payrollService.bulkMarkAsPaid(bulkPeriod);
      const total = result?.data?.total_paid ?? result?.total_paid ?? approvedForBulk.length;
      showToast(`✅ ${total} payroll periode ${bulkPeriod} berhasil ditandai dibayar`, "success");
      setBulkPayModal(false);
      const pays = await payrollService.getPayrollList();
      setAllPayrolls(toSafeArray(pays));
    } catch (err) { showToast(err instanceof Error ? err.message : "Gagal", "error"); }
    finally { setBulkPayLoading(false); }
  };

  const safePayrolls = Array.isArray(allPayrolls) ? allPayrolls : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const getEmpName = (empId: string | number) => {
    const e = safeEmployees.find(entry => entry.id === empId || String(entry.id) === String(empId));
    return e ? `${e.employee_code} - ${e.user?.name || "Unknown"}` : "Unknown";
  };

  // Bulk pay kalkulasi
  const allPeriods = Array.from(new Set(safePayrolls.map(p => p.period).filter(Boolean))).sort().reverse() as string[];
  const approvedForBulk = safePayrolls.filter(p => p.status === "approved" && (bulkPeriod === "" || String(p.period) === bulkPeriod));
  const totalBulkTHP = approvedForBulk.reduce((s, p) => s + Number(p.take_home_pay || p.net_salary || 0), 0);

  // Filter tabel
  const filteredPayrolls = safePayrolls.filter(p => {
    if (paymentFilter === 'paid' && String(p.status).toLowerCase() !== 'paid') return false;
    if (paymentFilter === 'unpaid' && String(p.status).toLowerCase() === 'paid') return false;
    if (periodFilter !== 'all' && String(p.period) !== periodFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const emp = safeEmployees.find(e => String(e.id) === String(p.employee_id) || e.employee_code === String(p.employee_id));
      const name = emp?.user?.name || emp?.employee_code || "";
      if (!String(p.id).toLowerCase().includes(q) && !String(p.period || "").toLowerCase().includes(q) && !name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const totalPagesRecent = Math.max(1, Math.ceil(filteredPayrolls.length / pageSizeRecent));
  const safePageRecent = Math.min(currentPageRecent, totalPagesRecent);
  const recentPayrolls = filteredPayrolls.slice((safePageRecent - 1) * pageSizeRecent, safePageRecent * pageSizeRecent);

  const summaryCards = [
    { label: "All Payroll", subtitle: "Total", value: String(safePayrolls.length), tone: "blue" as const, icon: FileText },
    { label: "Approved", subtitle: "Siap dibayar", value: String(safePayrolls.filter(i => i.status === "approved").length), tone: "orange" as const, icon: ShieldCheck },
    { label: "Paid", subtitle: "Sudah dibayar", value: String(safePayrolls.filter(i => i.status === "paid").length), tone: "purple" as const, icon: CreditCard },
  ];

  return (
    <>
      {/* ── PANEL BAYAR MASSAL ── */}
      <Card className="bulk-pay-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1.5px solid #86efac', borderRadius: 16, marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#065f46' }}>Pembayaran Massal</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#34d399' }}>Bayar semua payroll yang sudah approved sekaligus per periode</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Pilih Periode</label>
            <select
              value={bulkPeriod}
              onChange={(e) => setBulkPeriod(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #6ee7b7', background: '#fff', fontSize: '0.9rem', fontFamily: "'Poppins',sans-serif", color: '#065f46', outline: 'none' }}
            >
              <option value="">-- Pilih Periode --</option>
              {allPeriods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #a7f3d0', padding: '10px 14px', minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {bulkPeriod ? (
              approvedForBulk.length > 0 ? (
                <>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>✅ {approvedForBulk.length} payroll siap dibayar</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 700, color: '#065f46' }}>Total: Rp {totalBulkTHP.toLocaleString('id-ID')}</p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>Tidak ada payroll <strong>approved</strong> di periode ini</p>
              )
            ) : (
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#9ca3af' }}>Pilih periode untuk melihat detail</p>
            )}
          </div>
          {canPay && (
          <button
            onClick={() => { if (!bulkPeriod) { showToast("Pilih periode dulu", "error"); return; } setBulkPayModal(true); }}
            disabled={loading || !bulkPeriod || approvedForBulk.length === 0}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              borderRadius: 10, border: 'none',
              background: approvedForBulk.length > 0 && bulkPeriod ? 'linear-gradient(135deg,#10b981,#059669)' : '#d1fae5',
              color: approvedForBulk.length > 0 && bulkPeriod ? '#fff' : '#6b7280',
              fontSize: '0.9rem', fontWeight: 700, fontFamily: "'Poppins',sans-serif",
              cursor: approvedForBulk.length > 0 && bulkPeriod ? 'pointer' : 'not-allowed',
              boxShadow: approvedForBulk.length > 0 && bulkPeriod ? '0 4px 12px rgba(16,185,129,0.35)' : 'none',
              whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
          >
            <Zap size={16} />
            {approvedForBulk.length > 0 ? `Bayar ${approvedForBulk.length} Payroll` : 'Bayar Semua'}
          </button>
          )}
        </div>
      </Card>

      {/* Modal Konfirmasi Bulk Pay */}
      <Modal isOpen={bulkPayModal} onClose={() => setBulkPayModal(false)} title="Konfirmasi Pembayaran Massal" size="md">
        <div style={{ padding: '8px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}><Zap size={48} color="#10b981" /></div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#166534' }}>Tandai {approvedForBulk.length} payroll sebagai DIBAYAR</p>
            <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#166534' }}>
              Periode: <strong>{bulkPeriod}</strong><br />
              Total THP: <strong>Rp {totalBulkTHP.toLocaleString('id-ID')}</strong>
            </p>
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: 8, fontSize: '0.875rem', color: '#9a3412' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Tindakan ini <strong>tidak dapat dibatalkan</strong>. Semua payroll approved di periode <strong>{bulkPeriod}</strong> akan jadi <strong>paid</strong> permanen.</span>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="outline" size="md" onClick={() => setBulkPayModal(false)} disabled={bulkPayLoading}>Batal</Button>
            {canPay && (
            <Button variant="primary" size="md" onClick={() => void handleBulkPay()} disabled={bulkPayLoading}>
              <Zap size={16} style={{ marginRight: 6 }} />
              {bulkPayLoading ? 'Memproses...' : `Ya, Bayar ${approvedForBulk.length} Payroll`}
            </Button>
            )}
          </div>
        </div>
      </Modal>

      <div className="payroll-summary-wrapper">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="payroll-summary-card">
              <div className="payroll-summary-header">
                <div><p className="payroll-summary-label">{c.label}</p></div>
                <div className={`payroll-summary-icon-wrapper payroll-icon-${c.tone}`}><Icon size={28} /></div>
              </div>
              <div className={`payroll-summary-value payroll-value-${c.tone}`}>{c.value}</div>
            </div>
          );
        })}
      </div>

      <Card className="crud-table-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <p style={{ fontWeight: 600, color: "#1e293b", margin: 0, fontSize: "0.9rem" }}>Payroll</p>
            <input placeholder="Cari ID, karyawan, atau periode" style={{ minWidth: 220, padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "'Poppins', sans-serif" }} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPageRecent(1); }} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as any); setCurrentPageRecent(1); }} className="sort-select">
              <option value="all">Semua Status</option><option value="unpaid">Belum Dibayar</option><option value="paid">Sudah Dibayar</option>
            </select>
            <select value={periodFilter} onChange={(e) => { setPeriodFilter(e.target.value); setCurrentPageRecent(1); }} className="sort-select">
              <option value="all">Semua Periode</option>
              {Array.from(new Set(safePayrolls.map(p => p.period).filter(Boolean))).map(prd => <option key={String(prd)} value={String(prd)}>{String(prd)}</option>)}
            </select>
          </div>
        </div>

        <div className="crud-table-wrap">
          <table className="crud-table" style={{ width: "100%", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th>ID</th><th>Karyawan</th><th>Periode</th><th className="numeric">Gaji Pokok</th>
                <th className="numeric">Take Home Pay</th><th>Status</th><th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {recentPayrolls.length > 0 ? recentPayrolls.map((payroll) => (
                <tr key={payroll.id} className={selectedPayroll?.id === payroll.id ? "is-selected-row" : ""}>
                  <td>{payroll.id}</td>
                  <td title={getEmpName(payroll.employee_id)}>{getEmpName(payroll.employee_id)}</td>
                  <td>{payroll.period}</td>
                  <td className="numeric">Rp {Number(payroll.basic_salary || 0).toLocaleString("id-ID")}</td>
                  <td className="numeric">Rp {Number(payroll.take_home_pay || payroll.net_salary || 0).toLocaleString("id-ID")}</td>
                  <td><PayrollStatusBadge status={payroll.status || 'pending'} size="sm" /></td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <Button variant="outline" size="sm" onClick={() => { setPayrollId(String(payroll.id)); setSelectedPayroll(payroll); }}>Lihat</Button>
                      {canPay && String(payroll.status).toLowerCase() !== 'paid' && (
                        <Button variant="primary" size="sm" onClick={() => { setPayrollId(String(payroll.id)); setSelectedPayroll(payroll); }}>Tandai Dibayar</Button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>Tidak ada payroll untuk kriteria ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredPayrolls.length > pageSizeRecent && (
          <div className="table-pagination">
            <div className="pagination-info">
              {filteredPayrolls.length === 0
                ? 'Menampilkan 0 data'
                : `Menampilkan ${(safePageRecent - 1) * pageSizeRecent + 1}-${Math.min(safePageRecent * pageSizeRecent, filteredPayrolls.length)} dari ${filteredPayrolls.length} data`}
            </div>
            <div className="pagination-controls">
              <button className="pagination-btn" onClick={() => setCurrentPageRecent(Math.max(1, safePageRecent - 1))} disabled={safePageRecent === 1}>‹</button>
              {Array.from({ length: totalPagesRecent }, (_, i) => i + 1).map((page) => (
                <button key={page} className={`pagination-btn ${safePageRecent === page ? 'active' : ''}`} onClick={() => setCurrentPageRecent(page)}>{page}</button>
              ))}
              <button className="pagination-btn" onClick={() => setCurrentPageRecent(Math.min(totalPagesRecent, safePageRecent + 1))} disabled={safePageRecent === totalPagesRecent}>›</button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={!!selectedPayroll} onClose={() => setSelectedPayroll(null)} title={`Konfirmasi Pembayaran ID ${selectedPayroll?.id}`} size="lg">
        {selectedPayroll && (
          <div>
            <div className="payroll-payment-status-wrap" style={{ marginBottom: "1.5rem" }}>
              <PayrollStatusBadge status={selectedPayroll.status || 'pending'} size="lg" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Payroll ID</p>
                <p style={{ fontWeight: 600, color: "#1e293b", margin: "0 0 1rem" }}>{selectedPayroll.id}</p>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Karyawan</p>
                <p style={{ fontWeight: 600, color: "#1e293b", margin: "0 0 1rem" }}>{getEmpName(selectedPayroll.employee_id)}</p>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Periode</p>
                <p style={{ fontWeight: 600, color: "#1e293b", margin: "0 0 1rem" }}>{selectedPayroll.period}</p>
              </div>
              <div>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Gaji Pokok</p>
                <p style={{ fontWeight: 600, color: "#10b981", margin: "0 0 1rem" }}>Rp {Number(selectedPayroll.basic_salary || 0).toLocaleString("id-ID")}</p>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Tunjangan</p>
                <p style={{ fontWeight: 600, color: "#10b981", margin: "0 0 1rem" }}>Rp {Number(selectedPayroll.allowance || 0).toLocaleString("id-ID")}</p>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Bonus</p>
                <p style={{ fontWeight: 600, color: "#10b981", margin: "0 0 1rem" }}>Rp {Number(selectedPayroll.bonus || 0).toLocaleString("id-ID")}</p>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>Total Potongan</p>
                <p style={{ fontWeight: 600, color: "#dc2626", margin: "0 0 1rem" }}>Rp {Number(selectedPayroll.total_deduction || 0).toLocaleString("id-ID")}</p>
              </div>
            </div>
            {(selectedPayroll.take_home_pay || selectedPayroll.net_salary) && (
              <div style={{ padding: "1rem", background: "rgba(16, 185, 129, 0.05)", borderRadius: 8, border: "1px solid rgba(16, 185, 129, 0.1)", textAlign: "center", marginTop: "1rem" }}>
                <p style={{ fontSize: "0.75rem", color: "#166534", margin: 0 }}>Gaji Bersih (Take Home Pay)</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#059669", margin: "4px 0 0" }}>Rp {Number(selectedPayroll.take_home_pay || selectedPayroll.net_salary || 0).toLocaleString("id-ID")}</p>
              </div>
            )}
            <div style={{ marginTop: "2rem", display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <Button variant="outline" size="md" onClick={() => setSelectedPayroll(null)} disabled={loading}>Batal</Button>
              {selectedPayroll.status === "paid" ? (
                <div style={{ color: "#10b981", fontWeight: 500 }}>Payroll ini sudah dibayar</div>
              ) : (
                canPay && (
                <Button variant="primary" size="md" onClick={() => void handleMarkAsPaid()} disabled={loading}>Tandai Sebagai Dibayar</Button>
                )
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export type { TabKey as PayrollProcessMode };
export default PayrollProcessPage;
