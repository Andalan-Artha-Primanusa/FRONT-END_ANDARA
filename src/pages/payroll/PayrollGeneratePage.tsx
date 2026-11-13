import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  Zap,
  Clock,
  Wallet,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
} from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Modal } from "@/shared/ui/Modal";
import { showToast } from "@/shared/ui/toast";
import { PayrollStatusBadge } from "@/shared/ui/PayrollStatusBadge";
import {
  generateMonthlyPayroll,
  getAllPayroll,
  toSafeArray,
} from "@/features/payroll/api/payroll.service";
import type { PayrollItem, PayrollStatus } from "@/features/payroll/types/payroll.types";
import { parsePaginatedResponse } from "@/shared/api/pagination";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./PayrollGeneratePage.css";
import "./PayrollListPage.css";
import { PageHeader } from "@/shared/ui";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const formatCurrency = (value: unknown): string => {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "Rp 0";
  return `Rp ${num.toLocaleString("id-ID")}`;
};

const MONTHS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const PER_PAGE_OPTIONS = [5, 10, 25, 50];

/* ─────────────────────────────────────────────────────────────
   Inline style helpers
───────────────────────────────────────────────────────────── */
const TONE_COLORS: Record<string, string> = {
  blue: "var(--color-primary)",
  orange: "#f97316",
  green: "#22c55e",
  purple: "#8b5cf6",
};
const TONE_BG: Record<string, string> = {
  blue: "rgba(59,130,246,0.08)",
  orange: "rgba(249,115,22,0.08)",
  green: "rgba(34,197,94,0.08)",
  purple: "rgba(139,92,246,0.08)",
};

const S = {
  page: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.25rem",
    fontFamily: "'Poppins', sans-serif",
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: "1.25rem",
    alignItems: "start",
  } as React.CSSProperties,

  /* hero */
  heroInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap" as const,
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 12px",
    borderRadius: "16px",
    background: "rgba(10, 122, 62,0.08)",
    color: "var(--color-primary)",
    fontSize: "12px",
    fontWeight: 600,
    marginBottom: "10px",
  },
  heroTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 6px",
    lineHeight: 1.2,
  },
  heroSubtitle: { fontSize: "0.875rem", color: "#64748b", margin: 0 },

  /* summary */
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  },
  summaryCard: (tone: string): React.CSSProperties => ({
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "1.5rem",
    borderTop: `3px solid ${TONE_COLORS[tone] ?? "#94a3b8"}`,
    fontFamily: "'Poppins', sans-serif",
  }),
  summaryLabel: {
    fontSize: "0.875rem",
    color: "#64748b",
    fontWeight: 500,
    marginBottom: "0.25rem",
  },
  summarySubtitle: { fontSize: "0.8rem", color: "#94a3b8", margin: 0 },
  summaryValueRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "0.5rem",
  },
  summaryValue: (tone: string): React.CSSProperties => ({
    fontSize: "1.75rem",
    fontWeight: 700,
    color: TONE_COLORS[tone] ?? "#334155",
    lineHeight: 1.2,
    fontFamily: "'Poppins', sans-serif",
  }),
  summaryIconBox: (tone: string): React.CSSProperties => ({
    width: 64,
    height: 64,
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: TONE_BG[tone] ?? "rgba(148,163,184,0.08)",
    color: TONE_COLORS[tone] ?? "#94a3b8",
    flexShrink: 0,
  }),
  summaryTrend: {
    fontSize: "0.75rem",
    color: "#64748b",
    margin: 0,
    paddingTop: "1rem",
    borderTop: "1px solid #e2e8f0",
    fontFamily: "'Poppins', sans-serif",
  },

  /* config card */
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#1e293b",
    margin: "0 0 1.25rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'Poppins', sans-serif",
  },
  formLabel: {
    display: "block",
    fontSize: "0.7rem",
    fontWeight: 800,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "6px",
    fontFamily: "'Poppins', sans-serif",
  },
  select: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
    fontFamily: "'Poppins', sans-serif",
    background: "#fff",
    color: "#1e293b",
    cursor: "pointer",
  },
  periodPreview: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e0e7ff",
    background: "#eef2ff",
    fontSize: "15px",
    fontWeight: 800,
    color: "#6366f1",
    letterSpacing: "0.08em",
    textAlign: "center" as const,
    marginTop: "8px",
    fontFamily: "'Poppins', sans-serif",
  },
  infoBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    background: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "10px",
    padding: "12px",
    marginTop: "1rem",
    marginBottom: "1.25rem",
  },
  infoText: { fontSize: "12px", color: "#0369a1", lineHeight: 1.6, margin: 0 },
  btnGenerate: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, var(--hero-bg-start), var(--hero-bg-end))",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 700,
    fontFamily: "'Poppins', sans-serif",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  btnOutline: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "10px",
    border: "1.5px solid #e2e8f0",
    background: "#fff",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
  },
  divider: { border: "none", borderTop: "1px solid #f1f5f9", margin: "1.25rem 0" },

  /* success bar */
  successBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
  },

  /* table toolbar */
  tableHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "1rem",
    flexWrap: "wrap" as const,
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap" as const,
  },
  filterChip: (active: boolean): React.CSSProperties => ({
    padding: "5px 14px",
    borderRadius: "16px",
    border: active ? "1.5px solid #6366f1" : "1.5px solid #e2e8f0",
    background: active ? "#eef2ff" : "#fff",
    color: active ? "#6366f1" : "#94a3b8",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    transition: "all 0.15s",
  }),
  filterSelect: {
    padding: "5px 10px",
    borderRadius: "8px",
    border: "1.5px solid #e2e8f0",
    fontSize: "12px",
    color: "#64748b",
    fontFamily: "'Poppins', sans-serif",
    background: "#fff",
    cursor: "pointer",
  },

  /* table */
  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    overflowX: "auto" as const,
  },
  th: {
    padding: "10px 12px",
    textAlign: "left" as const,
    fontSize: "11px",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap" as const,
    background: "#f8fafc",
  },
  td: { padding: "11px 12px", verticalAlign: "middle" as const },

  /* cells */
  cellId: { fontSize: "12px", color: "#cbd5e1", fontFamily: "'Poppins', sans-serif" },
  cellName: {
    fontWeight: 600,
    fontSize: "13px",
    color: "#1e293b",
    whiteSpace: "nowrap" as const,
    fontFamily: "'Poppins', sans-serif",
  },
  cellPeriod: {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: "6px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    fontSize: "11px",
    color: "#64748b",
    fontFamily: "'Poppins', sans-serif",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
  },
  cellMoney: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: "12px",
    whiteSpace: "nowrap" as const,
  },

  /* pagination */
  paginationBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "1rem",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  paginationInfo: { fontSize: "12px", color: "#94a3b8", fontFamily: "'Poppins', sans-serif" },
  paginationControls: { display: "flex", alignItems: "center", gap: "4px" },
  pageBtn: (active: boolean, disabled?: boolean): React.CSSProperties => ({
    minWidth: 32,
    height: 32,
    padding: "0 6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    border: active ? "none" : "1.5px solid #e2e8f0",
    background: active ? "#6366f1" : "#fff",
    color: active ? "#fff" : disabled ? "#cbd5e1" : "#64748b",
    fontSize: "12px",
    fontWeight: active ? 700 : 500,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Poppins', sans-serif",
    opacity: disabled ? 0.5 : 1,
  }),
  perPageSelect: {
    padding: "5px 10px",
    borderRadius: "8px",
    border: "1.5px solid #e2e8f0",
    fontSize: "12px",
    color: "#64748b",
    fontFamily: "'Poppins', sans-serif",
    background: "#fff",
    cursor: "pointer",
  },
  emptyState: {
    padding: "3rem 1rem",
    textAlign: "center" as const,
    color: "#cbd5e1",
    fontSize: "13px",
  },
};

/* ─────────────────────────────────────────────────────────────
   Pagination helper
───────────────────────────────────────────────────────────── */
function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  const push = (p: number) => { if (!pages.includes(p)) pages.push(p); };
  push(1);
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) push(p);
  if (current < total - 2) pages.push("...");
  push(total);
  return pages;
}

/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */
const PayrollGeneratePage = () => {
  const now = new Date();

  const [items, setItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(false);
  /* period selectors */
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(
    String(now.getMonth() + 1).padStart(2, "0")
  );
  const period = `${selectedYear}-${selectedMonth}`;

  /* filters */
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  /* pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  /* ── API ── */
  const loadPayroll = async (silent = false) => {
    setLoading(true);
    try {
      const result = await getAllPayroll({ page: currentPage, per_page: itemsPerPage });
      const parsed = parsePaginatedResponse<PayrollItem>(result);
      setItems(parsed.items.length ? parsed.items : toSafeArray(result));
      setTotalPages(parsed.totalPages);
    } catch (err) {
      if (!silent) showToast(err instanceof Error ? err.message : "Gagal memuat payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  const generateMonthly = async () => {
    if (!period.trim()) {
      showToast("Pilih periode terlebih dahulu", "error");
      return;
    }
    setLoading(true);
    try {
      await generateMonthlyPayroll({ period });
      showToast(`Payroll berhasil dibuat untuk periode ${period}`, "success");
      await loadPayroll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal membuat payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayroll(true);
  }, [currentPage, itemsPerPage]);

  /* ── Derived ── */
  const summaryCards = useMemo(() => {
    const paidCount = items.filter(
      (i) => String(i.status).toLowerCase() === "paid"
    ).length;
    const pendingCount = items.filter((i) =>
      ["pending", "draft"].includes(String(i.status).toLowerCase())
    ).length;
    const totalPayroll = items.reduce(
      (sum, i) => sum + (Number(i.take_home_pay) || 0),
      0
    );
    return [
      {
        label: "Total Payroll",
        subtitle: "Semua data payroll",
        value: String(items.length),
        change: `${formatCurrency(totalPayroll)} total`,
        tone: "blue",
        icon: LayoutDashboard,
      },
      {
        label: "Draft / Pending",
        subtitle: "Menunggu proses",
        value: String(pendingCount),
        change: "Perlu approval",
        tone: "orange",
        icon: Clock,
      },
      {
        label: "Sudah Dibayar",
        subtitle: "Batch selesai",
        value: String(paidCount),
        change: "Pembayaran selesai",
        tone: "green",
        icon: Wallet,
      },
      {
        label: "Periode Aktif",
        subtitle: "Target bulan ini",
        value: period,
        change: "Fokus operasional",
        tone: "purple",
        icon: CalendarDays,
      },
    ];
  }, [items, period]);

  const filteredItems = useMemo(
    () =>
      items.filter((it) => {
        const s = String(it.status).toLowerCase();
        const statusOk =
          paymentFilter === "all"
            ? true
            : paymentFilter === "paid"
            ? s === "paid"
            : s !== "paid";
        const yearOk =
          yearFilter === "all" ||
          String(it.period ?? "").startsWith(yearFilter);
        return statusOk && yearOk;
      }),
    [items, paymentFilter, yearFilter]
  );

  const [totalPages, setTotalPages] = useState(1);
  const paginatedItems = filteredItems;

  const safePage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));

  const handleFilterChange = (f: "all" | "paid" | "unpaid") => {
    setPaymentFilter(f);
    setCurrentPage(1);
  };
  const handleYearFilter = (v: string) => {
    setYearFilter(v);
    setCurrentPage(1);
  };
  const handlePerPage = (v: number) => {
    setItemsPerPage(v);
    setCurrentPage(1);
  };

  /* ── Columns ── */
  const columns = [
    { key: "id", label: "ID" },
    { key: "employee_id", label: "Karyawan" },
    { key: "period", label: "Periode" },
    { key: "basic_salary", label: "Gaji Pokok" },
    { key: "allowance", label: "Tunjangan" },
    { key: "bonus", label: "Bonus" },
    { key: "total_deduction", label: "Potongan" },
    { key: "take_home_pay", label: "Gaji Bersih" },
    { key: "status", label: "Status" },
  ];

  const renderCell = (item: PayrollItem, key: string) => {
    const val = (item as unknown as Record<string, unknown>)[key];
    switch (key) {
      case "id":
        return (
          <span style={S.cellId}>#{String(val ?? "").padStart(3, "0")}</span>
        );
      case "employee_id": {
        const emp = (item as unknown as Record<string, any>).employee as
          | Record<string, any>
          | undefined;
        return (
          <span style={S.cellName}>
            {emp?.user?.name ?? `EMP-${String(val).padStart(3, "0")}`}
          </span>
        );
      }
      case "period":
        return <span style={S.cellPeriod}>{String(val ?? "-")}</span>;
      case "basic_salary":
      case "allowance":
      case "bonus":
      case "total_deduction":
      case "take_home_pay":
        return (
          <span
            style={{
              ...S.cellMoney,
              color:
                key === "take_home_pay"
                  ? "#6366f1"
                  : key === "total_deduction"
                  ? "#f43f5e"
                  : "#334155",
              fontWeight: key === "take_home_pay" ? 700 : 500,
            }}
          >
            {formatCurrency(val)}
          </span>
        );
      case "status": {
        const statusVal = String(val) as PayrollStatus;
        return <PayrollStatusBadge status={statusVal} size="sm" />;
      }
      default:
        return <span>{String(val ?? "-")}</span>;
    }
  };

  /* ─────────────────── JSX ─────────────────── */
  return (
    <div className="crud-page payroll-page" style={S.page}>
      {/* ── Hero ── */}
      <PageHeader
        title="Generate Payroll Bulanan"
        subtitle="Sistem otomatisasi penggajian karyawan secara massal untuk periode tertentu dengan akurasi data real-time."
        badge={{ icon: Zap, label: "Operasi Penggajian" }}
        actions={
          <button
            className="btn-outline"
            onClick={() => void loadPayroll()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Sync Data
          </button>
        }
      />

      {/* ── Summary cards ── */}
      <div style={S.summaryGrid}>
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={S.summaryCard(card.tone)}>
              <p style={S.summaryLabel}>{card.label}</p>
              <p style={S.summarySubtitle}>{card.subtitle}</p>
              <div style={S.summaryValueRow}>
                <div style={S.summaryValue(card.tone)}>{card.value}</div>
                <div style={S.summaryIconBox(card.tone)}>
                  <Icon size={22} />
                </div>
              </div>
              <p style={S.summaryTrend}>{card.change}</p>
            </div>
          );
        })}
      </div>

      {/* ── Two-column layout ── */}
      <div style={S.twoCol}>

        {/* ── Konfigurasi Batch ── */}
        <Card className="crud-table-card">
          <p style={S.cardTitle}>
            <Zap size={15} color="#6366f1" />
            Konfigurasi Batch
          </p>

          {/* Tahun */}
          <label style={{ display: "block", marginBottom: "1rem" }}>
            <span style={S.formLabel}>Tahun</span>
            <select
              style={S.select}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {YEARS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          {/* Bulan */}
          <label style={{ display: "block", marginBottom: "1rem" }}>
            <span style={S.formLabel}>Bulan</span>
            <select
              style={S.select}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {/* Preview */}
          <span style={S.formLabel}>Periode terpilih</span>
          <div style={S.periodPreview}>{period}</div>

          <hr style={S.divider} />

          {/* Info box */}
          <div style={S.infoBox}>
            <AlertCircle size={15} color="#0369a1" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={S.infoText}>
              Proses ini akan mengkalkulasi tunjangan, bonus, dan potongan untuk{" "}
              <strong>semua karyawan aktif</strong> di periode {period}.
            </p>
          </div>

          {/* CTA */}
          <button
            style={S.btnGenerate}
            onClick={() => void generateMonthly()}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Zap size={15} />
            )}
            {loading ? "Memproses..." : "Generate Payroll Sekarang"}
          </button>
        </Card>

        {/* ── Daftar Payroll Terbaru ── */}
        <Card className="crud-table-card">
          {/* Toolbar */}
          <div style={S.tableHeader}>
            <p style={{ ...S.cardTitle, margin: 0 }}>
              <BarChart3 size={15} color="#6366f1" />
              Daftar Payroll
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400, marginLeft: 4 }}>
                ({filteredItems.length} records)
              </span>
            </p>

            <div style={S.filterBar}>
              {/* Per-page */}
              <select
                style={S.perPageSelect}
                value={itemsPerPage}
                onChange={(e) => handlePerPage(Number(e.target.value))}
              >
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} / hal
                  </option>
                ))}
              </select>

              {/* Year filter */}
              <select
                style={S.filterSelect}
                value={yearFilter}
                onChange={(e) => handleYearFilter(e.target.value)}
              >
                <option value="all">Semua Tahun</option>
                {YEARS.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Status chips */}
              {(["all", "paid", "unpaid"] as const).map((f) => (
                <button
                  key={f}
                  style={S.filterChip(paymentFilter === f)}
                  onClick={() => handleFilterChange(f)}
                >
                  {f === "all" ? "Semua" : f === "paid" ? "Dibayar" : "Tertunda"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={S.emptyState}>
              <RefreshCw
                size={20}
                className="animate-spin"
                style={{ display: "block", margin: "0 auto 8px", color: "#6366f1" }}
              />
              Memuat data...
            </div>
          ) : paginatedItems.length === 0 ? (
            <div style={S.emptyState}>Tidak ada data payroll yang ditemukan.</div>
          ) : (
            <div style={S.tableWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} style={S.th}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, idx) => (
                    <tr
                      key={String(item.id ?? idx)}
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#fafafa")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {columns.map((col) => (
                        <td key={`${String(item.id ?? idx)}-${col.key}`} style={S.td}>
                          {renderCell(item, col.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredItems.length > 0 && (
            <div style={S.paginationBar}>
              <span style={S.paginationInfo}>
                {filteredItems.length === 0
                  ? 'Menampilkan 0 data'
                  : `Menampilkan ${(safePage - 1) * itemsPerPage + 1}-${Math.min(safePage * itemsPerPage, filteredItems.length)} dari ${filteredItems.length} data`}
              </span>

              <div style={S.paginationControls}>
                <button
                  style={S.pageBtn(false, safePage === 1)}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft size={14} />
                </button>

                {buildPageNumbers(safePage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      style={{
                        minWidth: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        color: "#cbd5e1",
                      }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      style={S.pageBtn(p === safePage)}
                      onClick={() => setCurrentPage(p as number)}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  style={S.pageBtn(false, safePage === totalPages)}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PayrollGeneratePage;
