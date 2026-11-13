import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ArrowLeft, RefreshCw, AlertCircle, Info, UserCircle, LayoutDashboard, Download, Banknote } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { showToast } from "@/shared/ui/toast";
import { payrollService, toSafeArray } from "@/features/payroll/api/payroll.service";
import { getApiBaseUrl } from "@/shared/api/httpClient";
import { PayrollStatusBadge } from '@/shared/ui/PayrollStatusBadge';
import { getAllEmployees } from "@/features/employee/api/employee.service";
import type { PayrollCreatePayload, PayrollUpdatePayload, PayrollItem } from "@/features/payroll/types/payroll.types";
import { PaginationWithSize } from "@/shared/ui/Pagination";
import type { EmployeeItem } from "@/features/employee/types/employee.types";
import { parsePaginatedResponse } from "@/shared/api/pagination";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "@/pages/payroll/PayrollShared.css";
import { PageHeader } from "@/shared/ui";

type PayrollFormState = {
  id: string;
  employee_id: string;
  period: string;
  allowance: string;
  bonus: string;
};

const DEFAULT_FORM: PayrollFormState = {
  id: "",
  employee_id: "",
  period: new Date().toISOString().slice(0, 7),
  allowance: "",
  bonus: "",
};

const PayrollCrudPage = () => {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [form, setForm] = useState<PayrollFormState>(DEFAULT_FORM);
  const [view, setView] = useState<"list" | "form">("list");
  const [selectedPayrollId, setSelectedPayrollId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "delete">("create");
  const [exportModal, setExportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [exportType, setExportType] = useState<"bca" | "summary">("bca");
  const [exportLoading, setExportLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [employeesData, payrollsData] = await Promise.all([
        getAllEmployees(),
        payrollService.getPayrollList({ page: currentPage, per_page: itemsPerPage })
      ]);
      setEmployees(toSafeArray(employeesData));
      const parsed = parsePaginatedResponse<PayrollItem>(payrollsData);
      setPayrolls(parsed.items.length ? parsed.items : toSafeArray(payrollsData));
      setTotalPages(parsed.totalPages);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setForm(DEFAULT_FORM);
    setMode("create");
    setView("form");
  };

  const selectPayroll = (payroll: PayrollItem, action: "edit" | "delete") => {
    setSelectedPayrollId(String(payroll.id));
    setForm({
      id: String(payroll.id),
      employee_id: String(payroll.employee_id),
      period: payroll.period,
      allowance: String(payroll.allowance || ""),
      bonus: String(payroll.bonus || ""),
    });
    setMode(action);
    setView("form");
  };

  const handleSave = async () => {
    if (mode === "create") await handleCreate();
    else if (mode === "edit") await handleUpdate();
    else if (mode === "delete") await handleDelete();
  };

  const handleCreate = async () => {
    if (!form.employee_id) {
      showToast("Pilih karyawan terlebih dahulu", "error");
      return;
    }

    if (!form.period) {
      showToast("Masukkan periode (Tahun-Bulan)", "error");
      return;
    }

    setLoading(true);
    try {
      const payload: PayrollCreatePayload = {
        employee_id: Number(form.employee_id),
        period: form.period,
        allowance: Number(form.allowance) || 0,
        bonus: Number(form.bonus) || 0,
      };

      await payrollService.createPayroll(payload);
      showToast("Payroll berhasil dibuat", "success");
      setView("list");
      await loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal membuat payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const payload: PayrollUpdatePayload = {
        allowance: Number(form.allowance) || 0,
        bonus: Number(form.bonus) || 0,
      };
      const payrollId = String(form.id).replace(/^[A-Z]+/, "").replace(/^0+/, "") || form.id;
      await payrollService.updatePayroll(payrollId, payload);
      showToast("Payroll berhasil diperbarui", "success");
      setView("list");
      await loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memperbarui payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const payrollId = String(form.id).replace(/^[A-Z]+/, "").replace(/^0+/, "") || form.id;
      await payrollService.deletePayroll(payrollId);
      showToast("Payroll berhasil dihapus", "success");
      setView("list");
      await loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal hapus payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView("list");
    setForm(DEFAULT_FORM);
    setSelectedPayrollId("");
  };

  const handleExport = async () => {
    if (!exportPeriod) {
      showToast("Pilih periode terlebih dahulu", "error");
      return;
    }
    setExportLoading(true);
    try {
      const token = sessionStorage.getItem("token") || "";
      const baseUrl = getApiBaseUrl();

      const endpoint = exportType === "bca"
        ? `/payroll/export/bca-klikpay?period=${exportPeriod}`
        : `/payroll/export/summary?period=${exportPeriod}`;

      const url = `${baseUrl}${endpoint}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-Id": sessionStorage.getItem("selectedCompanyId") || "",
        },
      });

      if (!response.ok) {
        throw new Error("Gagal mengunduh file");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = exportType === "bca"
        ? `bca-klikpay-${exportPeriod}.csv`
        : `payroll-summary-${exportPeriod}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setExportModal(false);
      showToast("Ekspor berhasil", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal mengekspor", "error");
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [paymentFilter]);

  const filteredPayrolls = payrolls.filter((p) => {
    if (paymentFilter === 'all') return true;
    if (paymentFilter === 'paid') return String(p.status).toLowerCase() === 'paid';
    return String(p.status).toLowerCase() !== 'paid';
  });

  const [totalPages, setTotalPages] = useState(1);
  const paginatedPayrolls = filteredPayrolls;

  const getEmployeeName = (empId: string) => {
    const employee = employees.find((entry) => String(entry.id) === empId);
    return employee ? `${employee.employee_code} - ${employee.user?.name || "Unknown"}` : "N/A";
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Kelola Payroll"
        subtitle="Administer employee payroll records with precision. Create, update, or remove entries with a streamlined workflow."
        badge={{ icon: LayoutDashboard, label: "Operasi Penggajian" }}
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Sync
            </button>
            {view === 'list' && (
              <button
                className="btn-outline"
                onClick={() => setExportModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#059669', fontSize: '0.9rem', fontWeight: '600', fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}
              >
                <Download size={16} />
                Export Payroll
              </button>
            )}
            {view === 'list' && (
              <button className="btn-primary" onClick={openCreateForm} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: '600', fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
                <Plus size={16} />
                Tambah Payroll
              </button>
            )}
          </>
        }
      />

      {view === "list" && (
        <>
          <Card className="analytics-title-card">
              <div className="analytics-title-inner">
              <div className="analytics-icon">
                <LayoutDashboard size={24} />
              </div>
              <div>
                <h2 className="analytics-title">Daftar Payroll Karyawan</h2>
                <p className="analytics-subtitle">{payrolls.length} Total</p>
              </div>
            </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Filter:</span>
                  <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as any)} className="sort-select">
                    <option value="all">Semua Status</option>
                    <option value="unpaid">Belum Dibayar</option>
                    <option value="paid">Sudah Dibayar</option>
                  </select>
                </label>
              </div>
          </Card>

          <Card className="crud-table-card">
            <div className="crud-table-wrap">
              <table className="crud-table">
                <thead>
                  <tr>
                    <th>Karyawan</th>
                    <th>Periode</th>
                    <th>Gaji Pokok</th>
                    <th>Tunjangan</th>
                    <th>Bonus</th>
                    <th>Take Home Pay</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                      {paginatedPayrolls.length > 0 ? (
                        paginatedPayrolls.map((payroll) => (
                      <tr key={payroll.id} className={selectedPayrollId === String(payroll.id) ? "is-selected" : ""}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <UserCircle size={32} color="#94a3b8" />
                            <div style={{ fontWeight: '700' }}>{getEmployeeName(String(payroll.employee_id))}</div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '500', color: '#64748b' }}>
                            {new Date(payroll.period + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                          </div>
                        </td>
                        <td>Rp {Number(payroll.basic_salary || 0).toLocaleString("id-ID")}</td>
                        <td>Rp {Number(payroll.allowance || 0).toLocaleString("id-ID")}</td>
                        <td style={{ color: '#10b981', fontWeight: '600' }}>Rp {Number(payroll.bonus || 0).toLocaleString("id-ID")}</td>
                        <td style={{ fontWeight: '800', color: 'var(--primary)' }}>Rp {Number(payroll.take_home_pay || 0).toLocaleString("id-ID")}</td>
                        <td>
                          <PayrollStatusBadge status={payroll.status as any} size="sm" />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="action-btn-group" style={{ justifyContent: 'center' }}>
                            <button onClick={() => selectPayroll(payroll, "edit")} className="action-btn action-btn-edit" title="Edit">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => selectPayroll(payroll, "delete")} className="action-btn action-btn-delete" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="crud-empty-row">Belum ada data payroll. Klik "Tambah Payroll" untuk memulai.</td>
                  </tr>
                )}
                </tbody>
            </table>
            </div>

            {filteredPayrolls.length > itemsPerPage && (
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <PaginationWithSize
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(p) => setCurrentPage(p)}
                  totalItems={filteredPayrolls.length}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(size) => setItemsPerPage(size)}
                />
              </div>
            )}
          </Card>
        </>
      )}

        {view === "form" && (
          <Card className="crud-card" glass>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
              <button onClick={handleBack} className="action-btn" style={{ background: '#f1f5f9', color: '#64748b' }}>
                <ArrowLeft size={18} />
              </button>
              <h2 style={{ marginBottom: 0 }}>
                {mode === "create" && "Entri Payroll Baru"}
                {mode === "edit" && "Perbarui Data Payroll"}
                {mode === "delete" && "Konfirmasi Penghapusan"}
              </h2>
            </div>

            {mode !== "delete" ? (
              <div className="crud-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <label style={{ gridColumn: '1 / -1' }}>
                  <strong>Karyawan *</strong>
                  <select
                    className="crud-input"
                    value={form.employee_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
                    disabled={mode === "edit"}
                  >
                    <option value="">-- Pilih Karyawan --</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={String(employee.id)}>
                        {employee.employee_code} - {employee.user?.name || "Unknown"}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <strong>Periode Pembayaran *</strong>
                  <input
                    type="month"
                    className="crud-input"
                    value={form.period}
                    onChange={(e) => setForm((prev) => ({ ...prev, period: e.target.value }))}
                    disabled={mode === "edit"}
                  />
                </label>

                <label>
                  <strong>Tunjangan Tambahan</strong>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="crud-input"
                    value={form.allowance ? Number(form.allowance).toLocaleString("id-ID") : ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, allowance: e.target.value.replace(/\D/g, "") }))}
                    placeholder="Contoh: 1.500.000"
                  />
                </label>

                <label>
                  <strong>Bonus / Insentif</strong>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="crud-input"
                    value={form.bonus ? Number(form.bonus).toLocaleString("id-ID") : ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, bonus: e.target.value.replace(/\D/g, "") }))}
                    placeholder="Contoh: 500.000"
                  />
                </label>

                <div style={{ gridColumn: '1 / -1' }}>
                  <Card glass className="crud-info-card">
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <Info size={20} />
                      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Gaji pokok akan otomatis diambil dari profil karyawan saat payroll di-generate. 
                        Tunjangan dan bonus di sini adalah nilai tambahan manual.
                      </p>
                    </div>
      </Card>

      <Modal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
        title="Export Payroll"
        size="md"
        footer={
          <>
            <button className="modal-btn-cancel" onClick={() => setExportModal(false)}>Batal</button>
            <button className="modal-btn-confirm" onClick={handleExport} disabled={exportLoading}
              style={{ background: 'linear-gradient(135deg, var(--hero-bg-start) 0%, var(--hero-bg-end) 100%)', boxShadow: '0 4px 14px rgba(10, 122, 62, 0.3)' }}
            >
              {exportLoading ? <><RefreshCw size={16} className="animate-spin" /> Memproses...</> : <><Download size={16} /> Download CSV</>}
            </button>
          </>
        }
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>Pilih tipe export dan periode</p>
        <label className="modal-completion-label">Tipe Export</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: exportType === 'bca' ? '2px solid var(--color-primary)' : '2px solid #e2e8f0', background: exportType === 'bca' ? '#eff6ff' : '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setExportType('bca')}>
            <input type="radio" name="exportType" checked={exportType === 'bca'} onChange={() => setExportType('bca')} style={{ accentColor: 'var(--color-primary)' }} />
            <Banknote size={20} color="var(--color-primary)" />
            <div><div style={{ fontWeight: 600, color: '#1e293b' }}>BCA KlikPay CSV</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Format siap import ke BCA KlikPay untuk transfer massal</div></div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: exportType === 'summary' ? '2px solid var(--color-primary)' : '2px solid #e2e8f0', background: exportType === 'summary' ? '#eff6ff' : '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setExportType('summary')}>
            <input type="radio" name="exportType" checked={exportType === 'summary'} onChange={() => setExportType('summary')} style={{ accentColor: 'var(--color-primary)' }} />
            <Download size={20} color="var(--color-primary)" />
            <div><div style={{ fontWeight: 600, color: '#1e293b' }}>Summary Lengkap</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Detail gaji, tunjangan, potongan, BPJS, PPh21 per karyawan</div></div>
          </label>
        </div>
        <label className="modal-completion-label" style={{ marginTop: '16px' }}>Periode</label>
        <input type="month" className="crud-input" value={exportPeriod} onChange={(e) => setExportPeriod(e.target.value)} style={{ width: '100%', marginTop: '8px' }} />
      </Modal>
    </div>
              </div>
            ) : (
              <div className="crud-warning-card">
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Trash2 size={24} color="#f43f5e" />
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '1.1rem', color: '#991b1b', marginBottom: '0.5rem' }}>Hapus data payroll ini?</p>
                    <p style={{ margin: 0, color: '#b91c1c' }}>
                      Anda akan menghapus payroll untuk <strong>{getEmployeeName(form.employee_id)}</strong> periode <strong>{form.period}</strong>. 
                      Tindakan ini permanen dan tidak dapat dibatalkan.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="crud-actions" style={{ marginTop: '3rem', borderTop: '1px solid #f1f5f9', paddingTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <Button variant="outline" size="lg" onClick={handleBack} disabled={loading} style={{ borderRadius: '12px' }}>
                Batal
              </Button>
              <Button 
                variant={mode === "delete" ? "ghost" : "primary"} 
                size="lg" 
                onClick={() => void handleSave()} 
                disabled={loading}
                style={{ 
                  borderRadius: '12px', 
                  minWidth: '200px', 
                  fontWeight: '700',
                  background: mode === 'delete' ? '#ef4444' : 'var(--hero-bg-start)',
                  color: 'white',
                  border: 'none',
                  boxShadow: mode === 'delete' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(10, 122, 62, 0.2)'
                }}
              >
                {loading ? "Memproses..." : mode === "create" ? "Buat Payroll" : mode === "edit" ? "Simpan Perubahan" : "Hapus Permanen"}
              </Button>
            </div>
          </Card>
      )}
    </div>
  );
};

export default PayrollCrudPage;
