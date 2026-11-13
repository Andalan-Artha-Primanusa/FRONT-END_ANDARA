import { useState, useEffect, useMemo } from "react";
import { Card } from "@/shared/ui/Card";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Modal } from "@/shared/ui/Modal";
import { showToast } from "@/shared/ui/toast";
import { ArrowDown, ArrowUp, Briefcase, Filter, RefreshCw, Search, ChevronDown, Plus, Pencil, Trash2, ArrowLeft, AlertCircle, Download, Banknote, FileText, Info, X } from "lucide-react";

import { payrollService, toSafeArray } from "@/features/payroll/api/payroll.service";
import { getApiBaseUrl } from "@/shared/api/httpClient";
import { getAllEmployees } from "@/features/employee/api/employee.service";
import { PayrollStatusBadge } from "@/shared/ui/PayrollStatusBadge";
import { LoadingState, ErrorState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import type { PayrollCreatePayload, PayrollUpdatePayload, PayrollItem } from "@/features/payroll/types/payroll.types";
import type { EmployeeItem } from "@/features/employee/types/employee.types";
import { parsePaginatedResponse } from "@/shared/api/pagination";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./PayrollListPage.css";
import "./PayrollShared.css";
import { PageHeader } from "@/shared/ui";

type PayrollFormState = {
  id: string;
  employee_id: string;
  period: string;
  allowance: string;
  bonus: string;
};

const DEFAULT_FORM: PayrollFormState = {
  id: "", employee_id: "", period: new Date().toISOString().slice(0, 7), allowance: "", bonus: "",
};

interface PayrollWithEmployeeName extends PayrollItem {
  employeeName?: string;
}

const getNestedName = (...values: any[]) =>
  values.find((value) => typeof value === "string" && value.trim()) || "";

const getEmployeeSubtitle = (employee: any) => {
  const departmentName = getNestedName(
    employee?.department?.name,
    employee?.departmentRel?.name,
    employee?.department_rel?.name
  );
  const positionName = getNestedName(
    employee?.position?.name,
    employee?.positionRel?.name,
    employee?.position_rel?.name
  );

  return [departmentName, positionName].filter(Boolean).join(" • ");
};

const PayrollListPage = () => {
  const user = useAuthStore((state) => state.user);
  const canCreate = RBACUtils.hasPermission(user, PERMISSIONS.PAYROLL_CREATE);
  const canUpdate = RBACUtils.hasPermission(user, PERMISSIONS.PAYROLL_UPDATE);
  const canDelete = RBACUtils.hasPermission(user, PERMISSIONS.PAYROLL_DELETE);
  const canExport = RBACUtils.hasPermission(user, PERMISSIONS.PAYROLL_EXPORT);
  const [items, setItems] = useState<PayrollWithEmployeeName[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const [sortBy, setSortBy] = useState<"id" | "employee" | "period" | "total">("period");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalItems, setTotalItems] = useState(0);

  const [view, setView] = useState<"list" | "form">("list");
  const [form, setForm] = useState<PayrollFormState>(DEFAULT_FORM);
  const [mode, setMode] = useState<"create" | "edit" | "delete">("create");
  const [deleteTarget, setDeleteTarget] = useState<PayrollWithEmployeeName | null>(null);

  const [exportModal, setExportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [exportType, setExportType] = useState<"bca" | "summary">("bca");
  const [exportLoading, setExportLoading] = useState(false);

  const normalizePayroll = (payroll: any): any => ({
    ...payroll,
    basic_salary: payroll.basic_salary ?? payroll.gaji_pokok ?? 0,
    allowance: payroll.allowance ?? payroll.tunjangan ?? 0,
    bonus: payroll.bonus ?? payroll.lembur ?? payroll.bonus_khusus ?? 0,
    deduction: payroll.deduction ?? payroll.potongan ?? 0,
    tax: payroll.tax ?? payroll.pajak ?? 0,
    take_home_pay: payroll.take_home_pay ?? payroll.gaji_bersih ?? payroll.net_salary ?? 0,
    net_salary: payroll.net_salary ?? payroll.gaji_bersih ?? payroll.take_home_pay ?? 0,
    status: payroll.status ?? payroll.status_approval ?? payroll.status_pembayaran ?? 'draft',
    period: payroll.period ?? payroll.periode ?? '',
    employee_id: payroll.employee_id ?? payroll.karyawan_id ?? payroll.employee?.id ?? '',
  });

  const employeesWithNames = useMemo(() => {
    return employees.map((i: any) => ({ 
      id: i.id, 
      name: i.user?.name || i.full_name || i.fullName || `ID: ${i.id}` 
    })).filter((i: any) => i.name && i.name.trim() !== "").sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [employees]);

  const uniquePeriods = useMemo(() => {
    const periods = new Set<string>();
    items.forEach((item: any) => { if (item.period) periods.add(item.period); });
    return Array.from(periods).sort().reverse();
  }, [items]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>(["draft", "pending", "approved", "paid"]);
    items.forEach((item: any) => { if (item.status) statuses.add(item.status); });
    return Array.from(statuses).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter((item: any) =>
        (item.employeeName && item.employeeName.toLowerCase().includes(q)) ||
        String(item.id).toLowerCase().includes(q) ||
        String(item.employee_id).toLowerCase().includes(q));
    }
    if (selectedEmployeeId) filtered = filtered.filter((item: any) => String(item.employee_id) === selectedEmployeeId);
    if (selectedPeriod) filtered = filtered.filter((item: any) => item.period === selectedPeriod);
    if (selectedStatus) filtered = filtered.filter((item: any) => item.status === selectedStatus);
    return filtered;
  }, [items, searchText, selectedEmployeeId, selectedPeriod, selectedStatus]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a: any, b: any) => {
      let ca: any, cb: any;
      switch (sortBy) {
        case "employee": ca = a.employeeName?.toLowerCase() || ""; cb = b.employeeName?.toLowerCase() || ""; break;
        case "period": ca = a.period || ""; cb = b.period || ""; break;
        case "total": ca = (Number(a.basic_salary)||0)+(Number(a.allowance)||0)+(Number(a.bonus)||0); cb = (Number(b.basic_salary)||0)+(Number(b.allowance)||0)+(Number(b.bonus)||0); break;
        default: ca = String(a.id||""); cb = String(b.id||"");
      }
      return ca < cb ? (sortOrder === "asc" ? -1 : 1) : ca > cb ? (sortOrder === "asc" ? 1 : -1) : 0;
    });
  }, [filteredItems, sortBy, sortOrder]);

  const [totalPages, setTotalPages] = useState(1);
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const paginatedItems = sortedItems;

  useEffect(() => { setCurrentPage(1); }, [searchText, selectedEmployeeId, selectedPeriod, selectedStatus, sortBy, sortOrder]);

  const clearFilters = () => {
    setSearchText(""); setSelectedEmployeeId(""); setSelectedPeriod(""); setSelectedStatus(""); setSortBy("period"); setSortOrder("desc");
  };

  const activeFilterChips = [
    selectedEmployeeId
      ? {
          key: "employee",
          label: "Karyawan",
          value: employeesWithNames.find((employee) => String(employee.id) === selectedEmployeeId)?.name || selectedEmployeeId,
          onClear: () => setSelectedEmployeeId(""),
        }
      : null,
    selectedPeriod
      ? {
          key: "period",
          label: "Periode",
          value: selectedPeriod,
          onClear: () => setSelectedPeriod(""),
        }
      : null,
    selectedStatus
      ? {
          key: "status",
          label: "Status",
          value: selectedStatus,
          onClear: () => setSelectedStatus(""),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    onClear: () => void;
  }>;

  const activeFilterCount = activeFilterChips.length;

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [payrollData, employeeData] = await Promise.all([
        payrollService.getPayrollList({ page: currentPage, per_page: pageSize }),
        getAllEmployees(),
      ]);
      const parsed = parsePaginatedResponse<any>(payrollData);
      const safePayrollData = parsed.items.map(normalizePayroll);
      setTotalPages(parsed.totalPages);
      setTotalItems(parsed.total);
      
      const safeEmployeeData = Array.isArray(employeeData) ? employeeData : toSafeArray(employeeData);
      setEmployees(safeEmployeeData);

      const enrichedPayroll = safePayrollData.map((payroll: any) => {
        const emp = payroll.employee;
        const name = emp?.user?.name || emp?.full_name || `EMP-${payroll.employee_id}`;
        return { ...payroll, employeeName: name };
      });
      setItems(enrichedPayroll);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [currentPage, pageSize]);

  const getEmpLabel = (empId: string) => {
    const emp = employees.find((e) => String(e.id) === empId);
    return emp ? `${emp.employee_code} - ${emp.user?.name || "Unknown"}` : "N/A";
  };

  const handleCreate = async () => {
    if (!canCreate) {
      showToast("Anda tidak memiliki izin membuat payroll", "error");
      return;
    }
    if (!form.employee_id) { showToast("Pilih karyawan", "error"); return; }
    if (!form.period) { showToast("Masukkan periode", "error"); return; }
    setLoading(true);
    try {
      await payrollService.createPayroll({ employee_id: Number(form.employee_id), period: form.period, allowance: Number(form.allowance)||0, bonus: Number(form.bonus)||0 });
      showToast("Payroll berhasil dibuat", "success");
      setView("list"); await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal", "error");
    } finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    if (!canUpdate) {
      showToast("Anda tidak memiliki izin mengubah payroll", "error");
      return;
    }
    setLoading(true);
    try {
      await payrollService.updatePayroll(form.id, { allowance: Number(form.allowance)||0, bonus: Number(form.bonus)||0 });
      showToast("Payroll berhasil diperbarui", "success");
      setView("list"); await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal", "error");
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) {
      showToast("Anda tidak memiliki izin menghapus payroll", "error");
      return;
    }

    setLoading(true);
    try {
      await payrollService.deletePayroll(String(deleteTarget.id));
      showToast("Payroll berhasil dihapus", "success");
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal", "error");
    } finally { setLoading(false); }
  };

  const handleExport = async () => {
    if (!canExport) {
      showToast("Anda tidak memiliki izin export payroll", "error");
      return;
    }
    if (!exportPeriod) { showToast("Pilih periode", "error"); return; }
    setExportLoading(true);
    try {
      const token = sessionStorage.getItem("token") || "";
      const baseUrl = getApiBaseUrl();
      const endpoint = exportType === "bca" ? `/payroll/export/bca-klikpay?period=${exportPeriod}` : `/payroll/export/summary?period=${exportPeriod}`;
      const res = await fetch(`${baseUrl}${endpoint}`, { headers: { Authorization: `Bearer ${token}`, "X-Company-Id": sessionStorage.getItem("selectedCompanyId") || "" } });
      if (!res.ok) throw new Error("Gagal mengekspor");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${exportType === "bca" ? "bca-klikpay" : "payroll-summary"}-${exportPeriod}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      setExportModal(false);
      showToast("Ekspor berhasil", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal", "error");
    } finally { setExportLoading(false); }
  };

  const formatCurrency = (v: number | string) => `Rp ${Number(v||0).toLocaleString("id-ID")}`;

  const formContent = (
    <Card className="crud-card payroll-form-card" glass>
      <div className="payroll-form-header">
        <button onClick={() => setView("list")} className="action-btn payroll-back-btn"><ArrowLeft size={18} /></button>
        <h2>{mode === "create" ? "Entri Payroll Baru" : mode === "edit" ? "Perbarui Payroll" : "Konfirmasi Hapus"}</h2>
      </div>
      {mode !== "delete" ? (
        <div className="payroll-form-grid">
          <label className="payroll-field payroll-field-full">
            <strong>Karyawan *</strong>
            <select className="crud-input payroll-control" value={form.employee_id} onChange={(e) => setForm({...form, employee_id: e.target.value})} disabled={mode === "edit"}>
              <option value="">-- Pilih Karyawan --</option>
              {employees.map((e) => (<option key={e.id} value={String(e.id)}>{e.employee_code} - {e.user?.name || "Unknown"}</option>))}
            </select>
          </label>
          <label className="payroll-field">
            <strong>Periode *</strong>
            <input type="month" className="crud-input payroll-control payroll-month-input" value={form.period} onChange={(e) => setForm({...form, period: e.target.value})} disabled={mode === "edit"} />
          </label>
          <label className="payroll-field">
            <strong>Tunjangan</strong>
            <input type="text" inputMode="numeric" className="crud-input payroll-control" value={form.allowance ? Number(form.allowance).toLocaleString("id-ID") : ""} onChange={(e) => setForm({...form, allowance: e.target.value.replace(/\D/g, "")})} placeholder="1.500.000" />
          </label>
          <label className="payroll-field">
            <strong>Bonus</strong>
            <input type="text" inputMode="numeric" className="crud-input payroll-control" value={form.bonus ? Number(form.bonus).toLocaleString("id-ID") : ""} onChange={(e) => setForm({...form, bonus: e.target.value.replace(/\D/g, "")})} placeholder="500.000" />
          </label>
          <div className="payroll-field-full">
            <Card glass className="crud-info-card payroll-info-card">
              <div><Info size={20} /><p>Gaji pokok otomatis dari profil karyawan. Tunjangan & bonus di sini nilai tambahan manual.</p></div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="crud-warning-card">
          <div style={{ display: "flex", gap: "1rem" }}><Trash2 size={24} color="#f43f5e" /><div><p style={{ fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>Hapus payroll ini?</p><p style={{ margin: 0, color: "#b91c1c" }}>Payroll untuk <strong>{getEmpLabel(form.employee_id)}</strong> periode <strong>{form.period}</strong> akan dihapus permanen.</p></div></div>
        </div>
      )}
      <div className="crud-actions payroll-form-actions">
        <button className="btn-outline" onClick={() => setView("list")} disabled={loading}>Batal</button>
        {((mode === "create" && canCreate) || (mode === "edit" && canUpdate) || (mode === "delete" && canDelete)) && (
        <button className="btn-primary" onClick={mode === "create" ? handleCreate : mode === "edit" ? handleUpdate : handleDelete} disabled={loading} style={{ background: mode === "delete" ? "#ef4444" : "var(--hero-bg-start)", color: "#fff", border: "none", padding: "0.75rem 2rem", borderRadius: 12, fontWeight: 700 }}>
          {loading ? "Memproses..." : mode === "create" ? "Buat Payroll" : mode === "edit" ? "Simpan" : "Hapus Permanen"}
        </button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="crud-page" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <PageHeader
        title="Daftar Payroll"
        subtitle="Lihat, tambah, edit, dan hapus seluruh data payroll karyawan."
        badge={{ icon: Briefcase, label: "Manajemen Payroll" }}
        scope
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadData()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync</button>
            {view === "list" && <>{canExport && <button className="btn-outline" onClick={() => setExportModal(true)} style={{ color: "#059669" }}><Download size={16} /> Export</button>}{canCreate && <button className="btn-primary" onClick={() => { setMode("create"); setForm(DEFAULT_FORM); setView("form"); }}><Plus size={16} /> Tambah Payroll</button>}</>}
          </>
        }
      />

      {view === "form" ? formContent : (
        <>
          <div className="payroll-summary-wrapper">
            {[
              { label: "Total Payroll", value: String(items.length), tone: "blue" as const, icon: Briefcase },
              { label: "Filtered", value: String(sortedItems.length), tone: "green" as const, icon: Search },
              { label: "Periode", value: String(uniquePeriods.length), tone: "orange" as const, icon: Briefcase },
              { label: "Status", value: String(uniqueStatuses.length), tone: "purple" as const, icon: Briefcase },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="payroll-summary-card">
                  <div className="payroll-summary-header">
                    <div><p className="payroll-summary-label">{card.label}</p></div>
                    <div className={`payroll-summary-icon-wrapper payroll-icon-${card.tone}`}><Icon size={28} /></div>
                  </div>
                  <div className={`payroll-summary-value payroll-value-${card.tone}`}>{card.value}</div>
                </div>
              );
            })}
          </div>

          <Card className="data-table-card">
            <div className="table-toolbar-shell">
              <div className="control-bar">
                <div className="quick-controls">
                  <div className="control-group">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select">
                      <option value="period">Urut: Periode</option><option value="employee">Urut: Karyawan</option><option value="total">Urut: Total</option><option value="id">Urut: ID</option>
                    </select>
                    <button className="sort-order-btn" onClick={() => setSortOrder(s => s === "asc" ? "desc" : "asc")}>{sortOrder === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}</button>
                  </div>
                  <button className={`filter-btn ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(!showFilters)}>
                    <Filter size={18} />
                    <span>Filter</span>
                    {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
                    <ChevronDown size={14} style={{ transform: showFilters ? "rotate(180deg)" : "", transition: "transform 0.3s ease" }} />
                  </button>
                </div>
                <div className="search-box"><Search size={18} className="search-icon-inside" /><input type="text" placeholder="Cari nama, ID payroll, atau ID karyawan..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="search-input" /></div>
              </div>

              {(searchText || activeFilterCount > 0) && (
                <div className="active-filter-row">
                  <div className="active-filter-summary">
                    {searchText && (
                      <span className="active-filter-chip search-chip">
                        <span>Cari</span>
                        <strong>{searchText}</strong>
                        <button onClick={() => setSearchText("")} aria-label="Hapus pencarian"><X size={14} /></button>
                      </span>
                    )}
                    {activeFilterChips.map((chip) => (
                      <span key={chip.key} className="active-filter-chip">
                        <span>{chip.label}</span>
                        <strong>{chip.value}</strong>
                        <button onClick={chip.onClear} aria-label={`Hapus filter ${chip.label}`}><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                  <button className="btn-clear subtle" onClick={clearFilters}>Reset semua</button>
                </div>
              )}
            </div>

            {showFilters && (
              <div className="filter-panel">
                <div className="filter-row">
                  <div className="filter-group">
                    <label>Karyawan</label><select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="filter-select"><option value="">Semua</option>{employeesWithNames.map((emp: any) => (<option key={emp.id} value={String(emp.id)}>{emp.name}</option>))}</select>
                  </div>
                  <div className="filter-group">
                    <label>Periode</label><select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="filter-select"><option value="">Semua</option>{uniquePeriods.map((p: string) => (<option key={p} value={p}>{p}</option>))}</select>
                  </div>
                  <div className="filter-group">
                    <label>Status</label><select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="filter-select"><option value="">Semua</option>{uniqueStatuses.map((s: string) => (<option key={s} value={s}>{s}</option>))}</select>
                  </div>
                </div>
              </div>
            )}

            {loading && <LoadingState message="Memuat data payroll..." />}
            {errorMessage && <ErrorState message="Gagal memuat" error={errorMessage} onRetry={loadData} />}

            {!loading && !errorMessage && sortedItems.length === 0 && (
              <EmptyState title="Tidak ada data" message={searchText||selectedEmployeeId||selectedPeriod||selectedStatus ? "Sesuaikan filter" : "Belum ada payroll"} actionLabel={searchText||selectedEmployeeId||selectedPeriod||selectedStatus ? "Bersihkan Filter" : "Buat Payroll"} onAction={searchText||selectedEmployeeId||selectedPeriod||selectedStatus ? clearFilters : () => { setMode("create"); setForm(DEFAULT_FORM); setView("form"); }} />
            )}

            {!loading && !errorMessage && sortedItems.length > 0 && (
              <>
                <div className="table-wrap">
                  <table className="data-table payroll-list-table">
                    <colgroup>
                      <col className="payroll-col-employee" />
                      <col className="payroll-col-period" />
                      <col className="payroll-col-money" />
                      <col className="payroll-col-money" />
                      <col className="payroll-col-money" />
                      <col className="payroll-col-status" />
                      <col className="payroll-col-actions" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Karyawan</th><th>Periode</th><th className="th-right">Gaji Pokok</th><th className="th-right">Tunjangan</th><th className="th-right">THP</th><th>Status</th><th className="th-center" style={{ width: 100 }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((item: any, idx) => (
                        <tr key={`${item.id}-${idx}`}>
                          <td className="crud-table-name">
                            <div className="cell-name">
                              <div className="cell-avatar">
                                {(item.employee?.user?.name || item.employeeName || 'P').charAt(0).toUpperCase()}
                              </div>
                              <div className="cell-stacked">
                                <span className="cell-name-text">{item.employee?.user?.name || item.employeeName || `ID: ${item.employee_id}`}</span>
                                {getEmployeeSubtitle(item.employee) && (
                                  <span className="cell-stacked__sub">{getEmployeeSubtitle(item.employee)}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td><span className="crud-table-tag">{item.period || "-"}</span></td>
                          <td className="crud-table-amount">{formatCurrency(item.basic_salary||0)}</td>
                          <td className="crud-table-amount">{formatCurrency(item.allowance||0)}</td>
                          <td className="crud-table-amount crud-table-amount-green">{formatCurrency(item.take_home_pay||item.net_salary||0)}</td>
                          <td><PayrollStatusBadge status={item.status} size="md" /></td>
                          <td className="td-center">
                            <div className="action-btn-group" style={{ justifyContent: "center" }}>
                              {canUpdate && <button className="action-btn action-btn-edit" title="Edit" onClick={() => { setForm({ id: String(item.id), employee_id: String(item.employee_id), period: item.period, allowance: String(item.allowance||""), bonus: String(item.bonus||"") }); setMode("edit"); setView("form"); }}><Pencil size={16} /></button>}
                              {canDelete && <button className="action-btn action-btn-delete" title="Hapus" onClick={() => setDeleteTarget(item)}><Trash2 size={16} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="table-pagination">
                    <div className="pagination-info">
                      {totalItems === 0
                        ? 'Menampilkan 0 data'
                        : `Menampilkan ${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, totalItems)} dari ${totalItems} data`}
                    </div>
                    <div className="pagination-controls">
                      <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>‹</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button key={page} className={`pagination-btn ${safePage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                      ))}
                      <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>›</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}

      <Modal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        title="Export Payroll"
        size="md"
        footer={
          <>
            <button className="modal-btn-cancel" onClick={() => setExportModal(false)}>Batal</button>
            {canExport && (
            <button className="modal-btn-confirm" onClick={handleExport} disabled={exportLoading} style={{ background: "linear-gradient(135deg, var(--hero-bg-start), var(--hero-bg-end))" }}>
              {exportLoading ? <><RefreshCw size={16} className="animate-spin" /> Memproses...</> : <><Download size={16} /> Download CSV</>}
            </button>
            )}
          </>
        }
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>Pilih tipe dan periode</p>
        <label className="modal-completion-label">Tipe Export</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {([["bca", "BCA KlikPay CSV", "Format siap import ke BCA KlikPay", Banknote], ["summary", "Summary Lengkap", "Detail gaji, tunjangan, potongan, BPJS, PPh21", FileText]] as const).map(([key, title, desc, Icon]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: exportType === key ? "2px solid var(--color-primary)" : "2px solid #e2e8f0", background: exportType === key ? "#eff6ff" : "#fff", cursor: "pointer" }} onClick={() => setExportType(key)}>
              <input type="radio" name="exportTypeList" checked={exportType === key} onChange={() => setExportType(key)} style={{ accentColor: "var(--color-primary)" }} />
              <Icon size={20} color="var(--color-primary)" />
              <div><div style={{ fontWeight: 600, color: "#1e293b" }}>{title}</div><div style={{ fontSize: "0.8rem", color: "#64748b" }}>{desc}</div></div>
            </label>
          ))}
        </div>
        <label className="modal-completion-label" style={{ marginTop: 16 }}>Periode</label>
        <input type="month" className="crud-input payroll-control payroll-month-input payroll-export-period-input" value={exportPeriod} onChange={(e) => setExportPeriod(e.target.value)} />
      </Modal>

      <ConfirmDialog
        isOpen={canDelete && !!deleteTarget}
        title="Hapus Payroll"
        message={`Payroll untuk "${deleteTarget?.employeeName || `ID: ${deleteTarget?.employee_id || "-"}`}" periode "${deleteTarget?.period || "-"}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={loading && !!deleteTarget}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default PayrollListPage;
