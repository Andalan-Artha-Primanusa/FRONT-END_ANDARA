import { useEffect, useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { CheckCircle2, CreditCard, Eye, FileText, Pencil, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { showToast } from "@/shared/ui/toast";
import {
  approvePayroll,
  createPayroll,
  deletePayroll,
  generateMonthlyPayroll,
  getAllPayroll,
  getPayrollDetail,
  markPayrollAsPaid,
  updatePayroll,
  toSafeArray,
} from "@/features/payroll/api/payroll.service";
import type { PayrollCreatePayload, PayrollItem, PayrollUpdatePayload } from "@/features/payroll/types/payroll.types";
import { parsePaginatedResponse } from "@/shared/api/pagination";
import { PageHeader } from "@/shared/ui";
import "../admin/AdminCrudPages.css";

type PayrollFormState = {
  id: string;
  employee_id: string;
  period: string;
  allowance: string;
  bonus: string;
};

const DEFAULT_FORM: PayrollFormState = {
  id: "",
  employee_id: "1",
  period: "2026-04",
  allowance: "2000000",
  bonus: "500000",
};

const asDisplay = (value: unknown) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getColumns = (items: PayrollItem[]) => {
  const defaultCols = ["id", "employee_id", "period", "allowance", "bonus", "status"];
  if (!Array.isArray(items) || items.length === 0 || !items[0] || typeof items[0] !== 'object') {
    return defaultCols;
  }

  const keys = Object.keys(items[0]);
  const merged = [...defaultCols, ...keys.filter((key) => !defaultCols.includes(key))];
  return merged.filter((key, index) => merged.indexOf(key) === index);
};

const PayrollManagementPage = () => {
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<PayrollFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const columns = useMemo(() => getColumns(items), [items]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const paginatedItems = items;
  const [totalPages, setTotalPages] = useState(1);

  const requireId = () => {
    const id = form.id.trim();
    if (!id) {
      return null;
    }
    return id;
  };

  const loadPayroll = async () => {
    setLoading(true);

    try {
      const result = await getAllPayroll({ page: currentPage, per_page: pageSize });
      const parsed = parsePaginatedResponse<PayrollItem>(result);
      setItems(parsed.items.length ? parsed.items : toSafeArray(result));
      setTotalPages(parsed.totalPages);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Gagal muat payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  const createPayrollItem = async () => {
    setLoading(true);

    try {
      const payload: PayrollCreatePayload = {
        employee_id: Number(form.employee_id) || 0,
        period: form.period,
        allowance: Number(form.allowance) || 0,
        bonus: Number(form.bonus) || 0,
      };
      await createPayroll(payload);
      showToast("Payroll berhasil dibuat", "success");
      await loadPayroll();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Gagal buat payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  const generateMonthly = async () => {
    setLoading(true);

    try {
      await generateMonthlyPayroll({ period: form.period });
      showToast("Payroll bulanan berhasil dibuat", "success");
      await loadPayroll();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Gagal membuat payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  const getDetail = async () => {
    const id = requireId();
    if (!id) {
      showToast("Masukkan Payroll ID terlebih dahulu", "error");
      return;
    }

    setLoading(true);

    try {
      const payrollId = String(id).replace(/^[A-Z]+/, "").replace(/^0+/, "") || id;
      const result = await getPayrollDetail(payrollId);
      setSelectedDetail(result as unknown as Record<string, unknown>);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Gagal muat detail", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async () => {
    const id = requireId();
    if (!id) {
      showToast("Masukkan Payroll ID terlebih dahulu", "error");
      return;
    }

    setLoading(true);

    try {
      const payload: PayrollUpdatePayload = {
        allowance: Number(form.allowance) || 0,
        bonus: Number(form.bonus) || 0,
      };

      const payrollId = String(id).replace(/^[A-Z]+/, "").replace(/^0+/, "") || id;
      await updatePayroll(payrollId, payload);
      showToast("Payroll berhasil diperbarui", "success");
      await loadPayroll();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Gagal memperbarui payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async () => {
    const id = requireId();
    if (!id) {
      showToast("Masukkan Payroll ID terlebih dahulu", "error");
      return;
    }

    setLoading(true);

    try {
      const payrollId = String(id).replace(/^[A-Z]+/, "").replace(/^0+/, "") || id;
      await deletePayroll(payrollId);
      showToast("Payroll berhasil dihapus", "success");
      await loadPayroll();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Gagal hapus payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  const approveItem = async () => {
    const id = requireId();
    if (!id) {
      showToast("Masukkan Payroll ID terlebih dahulu", "error");
      return;
    }

    setLoading(true);

    try {
      const payrollId = String(id).replace(/^[A-Z]+/, "").replace(/^0+/, "") || id;
      await approvePayroll(payrollId);
      showToast("Payroll berhasil disetujui", "success");
      await loadPayroll();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Gagal menyetujui payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async () => {
    const id = requireId();
    if (!id) {
      showToast("Masukkan Payroll ID terlebih dahulu", "error");
      return;
    }

    setLoading(true);

    try {
      const payrollId = String(id).replace(/^[A-Z]+/, "").replace(/^0+/, "") || id;
      await markPayrollAsPaid(payrollId);
      showToast("Payroll berhasil ditandai dibayar", "success");
      await loadPayroll();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Gagal menandai sebagai dibayar", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayroll();
  }, [currentPage, pageSize]);

  return (
    <div className="crud-page">
      <PageHeader
        title="Kelola Payroll"
        subtitle="Buat, edit, setujui, dan kelola pembayaran gaji karyawan"
        badge={{ icon: Settings2, label: "Operasi Penggajian" }}
        actions={
          <Button 
            variant="outline" 
            size="md" 
            onClick={() => void loadPayroll()} 
            disabled={loading}
            style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
          >
            <RefreshCw size={16} />
            Segarkan Data
          </Button>
        }
      />

      <Card className="crud-card" glass style={{ borderTop: "4px solid var(--color-primary)" }}>
        <h2 style={{ color: "var(--color-primary)", marginTop: 0, display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <FileText size={18} />
          Form Payroll
        </h2>
        <div className="crud-form-grid">
          <label>
            <strong style={{ color: "var(--color-primary)" }}>ID Payroll</strong>
            <input
              className="crud-input"
              value={form.id}
              onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
              placeholder="Opsional - otomatis jika kosongan"
            />
          </label>
          <label>
            <strong style={{ color: "var(--color-primary)" }}>ID Karyawan</strong>
            <input
              className="crud-input"
              value={form.employee_id}
              onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))}
            />
          </label>
          <label>
            <strong style={{ color: "var(--color-primary)" }}>Periode (YYYY-MM)</strong>
            <input
              className="crud-input"
              value={form.period}
              onChange={(event) => setForm((prev) => ({ ...prev, period: event.target.value }))}
            />
          </label>
          <label>
            <strong style={{ color: "var(--color-primary)" }}>Tunjangan</strong>
            <input
              type="text"
              inputMode="numeric"
              className="crud-input"
              value={form.allowance ? Number(form.allowance).toLocaleString("id-ID") : ""}
              onChange={(event) => setForm((prev) => ({ ...prev, allowance: event.target.value.replace(/\D/g, "") }))}
            />
          </label>
          <label>
            <strong style={{ color: "var(--color-primary)" }}>Bonus</strong>
            <input
              type="text"
              inputMode="numeric"
              className="crud-input"
              value={form.bonus ? Number(form.bonus).toLocaleString("id-ID") : ""}
              onChange={(event) => setForm((prev) => ({ ...prev, bonus: event.target.value.replace(/\D/g, "") }))}
            />
          </label>
        </div>

        <div className="crud-actions">
          <Button 
            variant="primary" 
            size="md" 
            onClick={() => void createPayrollItem()} 
            disabled={loading}
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Plus size={16} />
            Buat Payroll
          </Button>
          <Button 
            variant="secondary" 
            size="md" 
            onClick={() => void generateMonthly()} 
            disabled={loading}
            style={{ backgroundColor: "#0ea5e9" }}
          >
            <RefreshCw size={16} />
            Buat Bulanan
          </Button>
          <Button 
            variant="outline" 
            size="md" 
            onClick={() => void getDetail()} 
            disabled={loading}
            style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
          >
            <Eye size={16} />
            Lihat Detail
          </Button>
          <Button 
            variant="secondary" 
            size="md" 
            onClick={() => void updateItem()} 
            disabled={loading}
            style={{ backgroundColor: "#0ea5e9" }}
          >
            <Pencil size={16} />
            Perbarui
          </Button>
          <Button 
            variant="secondary" 
            size="md" 
            onClick={() => void approveItem()} 
            disabled={loading}
            style={{ backgroundColor: "#10b981" }}
          >
            <CheckCircle2 size={16} />
            Setujui
          </Button>
          <Button 
            variant="secondary" 
            size="md" 
            onClick={() => void markPaid()} 
            disabled={loading}
            style={{ backgroundColor: "#10b981" }}
          >
            <CreditCard size={16} />
            Tandai Dibayar
          </Button>
          <Button 
            variant="ghost" 
            size="md" 
            onClick={() => void deleteItem()} 
            disabled={loading}
            style={{ color: "#ef4444" }}
          >
            <Trash2 size={16} />
            Hapus
          </Button>
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        title="Detail Payroll"
        size="lg"
      >
        {selectedDetail && (
          <div className="payroll-management-detail-modal">
            <div className="payroll-detail-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>ID Payroll</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-primary)' }}>{String(selectedDetail.id)}</p>
              </div>
              <span className="payroll-status-pill" style={{ 
                backgroundColor: 
                  selectedDetail.status === 'paid' ? '#10b981' : 
                  selectedDetail.status === 'approved' ? 'var(--hero-bg-start)' : 
                  selectedDetail.status === 'pending' ? '#f59e0b' : '#999',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '99px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {String(selectedDetail.status || 'Draft').toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Karyawan ID</p>
                <p style={{ margin: 0, fontWeight: 500 }}>{String(selectedDetail.employee_id)}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Periode</p>
                <p style={{ margin: 0, fontWeight: 500 }}>{String(selectedDetail.period)}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Gaji Pokok</p>
                <p style={{ margin: 0, fontWeight: 500 }}>Rp {Number(selectedDetail.basic_salary || 0).toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Tunjangan</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#10b981' }}>+ Rp {Number(selectedDetail.allowance || 0).toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Bonus</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#10b981' }}>+ Rp {Number(selectedDetail.bonus || 0).toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Potongan</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#ef4444' }}>- Rp {Number(selectedDetail.total_deduction || 0).toLocaleString("id-ID")}</p>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--hero-bg-start)', borderRadius: '8px', color: 'white' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>Total Gaji Bersih (Take Home Pay)</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 700 }}>
                Rp {Number(selectedDetail.take_home_pay || selectedDetail.net_salary || 0).toLocaleString("id-ID")}
              </p>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="md" onClick={() => setSelectedDetail(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Card className="crud-card" glass style={{ borderTop: "4px solid var(--color-primary)" }}>
        <h2 style={{ color: "var(--color-primary)", marginTop: 0, display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <FileText size={18} />
          Daftar Payroll
        </h2>
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>
                    {column === "id" && "ID"}
                    {column === "employee_id" && "ID Karyawan"}
                    {column === "period" && "Periode"}
                    {column === "allowance" && "Tunjangan"}
                    {column === "bonus" && "Bonus"}
                    {column === "status" && "Status"}
                    {!["id", "employee_id", "period", "allowance", "bonus", "status"].includes(column) && column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => (
                  <tr key={String(item.id ?? index)}>
                    {columns.map((column) => (
                      <td key={`${String(item.id ?? index)}-${column}`}>
                        {asDisplay((item as unknown as Record<string, unknown>)[column])}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="submenu-table-empty">
                    Tidak ada data payroll tersedia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="table-pagination">
            <div className="pagination-info">
              Menampilkan {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, items.length)} dari {items.length}
            </div>
            <div className="pagination-controls">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                Sebelumnya
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
              ))}
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PayrollManagementPage;
