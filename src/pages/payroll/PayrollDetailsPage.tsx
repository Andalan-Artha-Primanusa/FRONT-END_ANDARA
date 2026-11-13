import { useEffect, useMemo, useState } from "react";
import { BarChart3, Eye, Gift, MinusCircle, Pencil, PlusCircle, RefreshCw, Search, Trash2, Wallet } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Modal } from "@/shared/ui/Modal";
import { getAllPayroll, payrollService, toSafeArray } from "@/features/payroll/api/payroll.service";
import { getAllEmployees } from "@/features/employee/api/employee.service";
import { showToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/errorHandler";
import type { PayrollDetail, PayrollItem } from "@/features/payroll/types/payroll.types";
import type { EmployeeItem } from "@/features/employee/types/employee.types";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./PayrollDetailsPage.css";
import { PageHeader } from "@/shared/ui";

type PayrollComponentType = "allowance" | "deduction";

type PayrollDetailsPageProps = {
  componentMode?: PayrollComponentType;
  showTabs?: boolean;
};

const PayrollDetailsPage = ({ componentMode, showTabs = true }: PayrollDetailsPageProps) => {
  const [componentType, setComponentType] = useState<PayrollComponentType>(componentMode ?? "allowance");
  const [items, setItems] = useState<PayrollDetail[]>([]);
  const [payrollId, setPayrollId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [detailId, setDetailId] = useState("");
  const [detailType, setDetailType] = useState<PayrollComponentType>(componentMode ?? "allowance");
  const [detailName, setDetailName] = useState("");
  const [detailAmount, setDetailAmount] = useState("");
  const [allPayrolls, setAllPayrolls] = useState<PayrollItem[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeItem[]>([]);
  const [overviewSearch, setOverviewSearch] = useState("");
  const [currentPageOverview, setCurrentPageOverview] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [viewDetail, setViewDetail] = useState<PayrollDetail | null>(null);

  const pageSizeOverview = 10;
  const isLockedMode = Boolean(componentMode);
  const pageTitle = componentType === "deduction" ? "Potongan Payroll" : "Tunjangan Payroll";
  const pageSubtitle = componentType === "deduction"
    ? "Kelola seluruh komponen potongan payroll karyawan dari satu halaman khusus."
    : "Kelola seluruh komponen tunjangan payroll karyawan dari satu halaman khusus.";

  const availablePayrolls = useMemo(
    () => allPayrolls.filter((payroll) => !selectedEmployeeId || String(payroll.employee_id) === selectedEmployeeId),
    [allPayrolls, selectedEmployeeId]
  );

  const getPayrollLabel = (payroll: PayrollItem) => {
    const employee = allEmployees.find((emp) => String(emp.id) === String(payroll.employee_id));
    const name = employee?.user?.name || employee?.employee_code || `EMP-${payroll.employee_id}`;
    return `#${payroll.id} - ${name} (${payroll.period})`;
  };

  const filteredOverviewItems = useMemo(() => {
    let list = Array.isArray(items) ? items.slice() : [];
    list = list.filter((item) => String(item.type).toLowerCase() === componentType);

    if (overviewSearch.trim()) {
      const query = overviewSearch.toLowerCase();
      list = list.filter((item) =>
        String(item.name || item.description || "").toLowerCase().includes(query) ||
        String(item.id || "").toLowerCase().includes(query)
      );
    }

    return list;
  }, [componentType, items, overviewSearch]);

  const [totalPagesOverview, setTotalPagesOverview] = useState(1);
  const paginatedOverview = filteredOverviewItems;

  const componentSummaryCards = useMemo(() => {
    const allowanceCount = items.filter((item) => String(item.type).toLowerCase() === "allowance").length;
    const deductionCount = items.filter((item) => String(item.type).toLowerCase() === "deduction").length;

    return [
      {
        label: "Total Komponen",
        subtitle: "Semua detail komponen payroll",
        value: String(items.length),
        tone: "blue" as const,
        icon: BarChart3,
      },
      {
        label: "Tunjangan",
        subtitle: "Komponen tunjangan",
        value: String(allowanceCount),
        tone: "green" as const,
        icon: Gift,
      },
      {
        label: "Potongan",
        subtitle: "Komponen potongan",
        value: String(deductionCount),
        tone: "orange" as const,
        icon: MinusCircle,
      },
      {
        label: "Mode Aktif",
        subtitle: "Jenis komponen",
        value: componentType === "deduction" ? "Potongan" : "Tunjangan",
        tone: "purple" as const,
        icon: componentType === "deduction" ? MinusCircle : Gift,
      },
    ];
  }, [componentType, items]);

  const fetchMetadata = async () => {
    try {
      const [payrollResponse, employeeResponse] = await Promise.all([getAllPayroll(), getAllEmployees()]);
      setAllPayrolls(toSafeArray(payrollResponse));
      setAllEmployees(Array.isArray(employeeResponse) ? employeeResponse : toSafeArray(employeeResponse));
    } catch (error) {
      console.error("Failed to fetch payroll metadata", error);
    }
  };

  const requirePayrollId = (): string | null => {
    const id = payrollId.trim();
    return id || null;
  };

  const loadPayrollDetails = async (silent = false) => {
    const id = requirePayrollId();

    if (!id) {
      showToast("Pilih Payroll terlebih dahulu", "error");
      return;
    }

    setLoading(true);
    try {
      const result = await payrollService.getPayrollDetail(id);
      const payrollData = result.data || result;
      const safeDetails = toSafeArray(payrollData.details || []);
      setItems(safeDetails);
      if (!silent) showToast(`Berhasil memuat ${safeDetails.length} komponen`, "success");
    } catch (error: unknown) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setFormMode("create");
    setDetailId("");
    setDetailType(componentType);
    setDetailName("");
    setDetailAmount("");
    setFormOpen(true);
  };

  const openEditForm = (item: PayrollDetail) => {
    setFormMode("edit");
    setDetailId(String(item.id || ""));
    setDetailType(item.type || componentType);
    setDetailName(item.name || item.description || "");
    setDetailAmount(String(item.amount || ""));
    setFormOpen(true);
  };

  const saveComponent = async () => {
    const id = requirePayrollId();

    if (!id) {
      showToast("Pilih Payroll terlebih dahulu", "error");
      return;
    }

    if (!detailName.trim()) {
      showToast("Nama komponen wajib diisi", "error");
      return;
    }

    setLoading(true);
    try {
      if (formMode === "edit" && detailId) {
        await payrollService.updatePayrollDetail(detailId, {
          type: detailType,
          name: detailName.trim(),
          amount: Number(detailAmount) || 0,
        });
        showToast("Komponen berhasil diperbarui", "success");
      } else {
        await payrollService.addPayrollDetail({
          payroll_id: Number(id),
          details: [{
            type: detailType,
            name: detailName.trim(),
            amount: Number(detailAmount) || 0,
          }],
        });
        showToast("Komponen berhasil ditambahkan", "success");
      }

      setFormOpen(false);
      await loadPayrollDetails(true);
    } catch (error: unknown) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteSingle = (item: PayrollDetail) => {
    setDetailId(String(item.id || ""));
    setDetailName(item.name || item.description || "");
    setDeleteDialogOpen(true);
  };

  const deleteSingle = async () => {
    const id = detailId.trim();

    if (!id) {
      showToast("Pilih komponen terlebih dahulu", "error");
      return;
    }

    setLoading(true);
    try {
      await payrollService.deletePayrollDetail(id);
      showToast("Komponen berhasil dihapus", "success");
      setDetailId("");
      setDeleteDialogOpen(false);
      await loadPayrollDetails(true);
    } catch (error: unknown) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDetailType(componentType);
    setCurrentPageOverview(1);
  }, [componentType]);

  useEffect(() => {
    if (componentMode) setComponentType(componentMode);
  }, [componentMode]);

  useEffect(() => {
    void fetchMetadata();
  }, []);

  useEffect(() => {
    if (!payrollId && availablePayrolls.length > 0) {
      const firstPayroll = availablePayrolls[0];
      setPayrollId(String(firstPayroll.id));
      setSelectedEmployeeId(String(firstPayroll.employee_id || ""));
    }
  }, [availablePayrolls, payrollId]);

  useEffect(() => {
    if (payrollId) {
      void loadPayrollDetails(true);
    } else {
      setItems([]);
    }
  }, [payrollId]);

  return (
    <div className="crud-page">
      <PageHeader
        title={componentMode ? pageTitle : "Komponen Payroll"}
        subtitle={componentMode ? pageSubtitle : "Kelola komponen tunjangan dan potongan payroll karyawan."}
        badge={{ icon: Wallet, label: "Pusat Payroll" }}
        actions={
          <button className="btn-outline" onClick={() => void loadPayrollDetails()} disabled={loading || !payrollId}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Segarkan
          </button>
        }
      />

      {showTabs && (
        <div className="payroll-component-tabs">
          <button
            className={`payroll-component-tab ${componentType === "allowance" ? "is-active" : ""}`}
            onClick={() => setComponentType("allowance")}
          >
            <Gift size={16} /> Tunjangan
          </button>
          <button
            className={`payroll-component-tab ${componentType === "deduction" ? "is-active" : ""}`}
            onClick={() => setComponentType("deduction")}
          >
            <MinusCircle size={16} /> Potongan
          </button>
        </div>
      )}

      <div className="payroll-details-summary-grid">
        {componentSummaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="payroll-details-summary-card">
              <div className="payroll-summary-header">
                <div>
                  <p className="payroll-summary-label">{card.label}</p>
                  <p className="payroll-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`payroll-summary-icon ${card.tone}`}>
                  <Icon size={22} />
                </div>
              </div>
              <div className="payroll-summary-value">{card.value}</div>
            </div>
          );
        })}
      </div>

      <Card className="crud-table-card payroll-component-list-card">
        <div className="payroll-details-overview-header">
          <div>
            <h2>{componentType === "allowance" ? "Daftar Tunjangan" : "Daftar Potongan"}</h2>
            <p className="payroll-list-subtitle">Pilih payroll, lalu kelola komponen langsung dari tabel.</p>
          </div>
          <Button variant="primary" size="md" onClick={openCreateForm} disabled={!payrollId || loading}>
            <PlusCircle size={16} /> Tambah Komponen
          </Button>
        </div>

        <div className="payroll-component-toolbar">
          <select className="crud-input crud-input--sm" value={selectedEmployeeId} onChange={(event) => { setSelectedEmployeeId(event.target.value); setPayrollId(""); }}>
            <option value="">Semua Karyawan</option>
            {allEmployees.map((employee) => (
              <option key={String(employee.id)} value={String(employee.id)}>
                {employee.user?.name || employee.employee_code || String(employee.id)}
              </option>
            ))}
          </select>
          <select className="crud-input crud-input--sm payroll-select-wide" value={payrollId} onChange={(event) => setPayrollId(event.target.value)}>
            <option value="">Pilih Payroll</option>
            {availablePayrolls.map((payroll) => (
              <option key={payroll.id} value={String(payroll.id)}>{getPayrollLabel(payroll)}</option>
            ))}
          </select>
          <div className="payroll-search-control">
            <Search size={16} />
            <input
              placeholder="Cari nama komponen..."
              value={overviewSearch}
              onChange={(event) => { setOverviewSearch(event.target.value); setCurrentPageOverview(1); }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadPayrollDetails()} disabled={loading || !payrollId}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Muat
          </Button>
        </div>

        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>ID</th>
                <th>Nama Komponen</th>
                <th style={{ width: 150 }}>Tipe</th>
                <th style={{ width: 180 }}>Jumlah</th>
                <th className="th-center" style={{ width: 150 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOverview.length > 0 ? (
                paginatedOverview.map((item, index) => (
                  <tr key={String(item.id ?? index)}>
                    <td><span className="crud-table-id">#{String(item.id ?? "-")}</span></td>
                    <td>
                      <div className="payroll-component-name">
                        <span>{item.name || item.description || "-"}</span>
                        <small>Payroll #{String(item.payroll_id || payrollId || "-")}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-badge--${String(item.type).toLowerCase()}`}>
                        {String(item.type).toLowerCase() === "deduction" ? "Potongan" : "Tunjangan"}
                      </span>
                    </td>
                    <td><span className="crud-table-amount">Rp {Number(item.amount || 0).toLocaleString("id-ID")}</span></td>
                    <td className="td-center">
                      <div className="action-btn-group">
                        <button className="action-btn action-btn-edit" title="Detail" onClick={() => setViewDetail(item)}>
                          <Eye size={16} />
                        </button>
                        <button className="action-btn action-btn-edit" title="Edit" onClick={() => openEditForm(item)}>
                          <Pencil size={16} />
                        </button>
                        <button className="action-btn action-btn-delete" title="Hapus" onClick={() => requestDeleteSingle(item)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="payroll-details-empty-row">
                    {payrollId
                      ? `Belum ada data ${componentType === "allowance" ? "tunjangan" : "potongan"} untuk payroll ini.`
                      : "Pilih payroll untuk menampilkan data komponen."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredOverviewItems.length > pageSizeOverview && (
          <div className="payroll-pagination">
            <div className="payroll-pagination-info">
              {filteredOverviewItems.length === 0
                ? 'Menampilkan 0 data'
                : `Menampilkan ${(currentPageOverview - 1) * pageSizeOverview + 1}-${Math.min(currentPageOverview * pageSizeOverview, filteredOverviewItems.length)} dari ${filteredOverviewItems.length} data`}
            </div>
            <div className="payroll-pagination-controls">
              <button className="payroll-pagination-btn" onClick={() => setCurrentPageOverview(Math.max(1, currentPageOverview - 1))} disabled={currentPageOverview === 1}>{"<"}</button>
              {Array.from({ length: totalPagesOverview }, (_, index) => index + 1).map((page) => (
                <button key={page} className={`payroll-pagination-btn ${currentPageOverview === page ? "active" : ""}`} onClick={() => setCurrentPageOverview(page)}>
                  {page}
                </button>
              ))}
              <button className="payroll-pagination-btn" onClick={() => setCurrentPageOverview(Math.min(totalPagesOverview, currentPageOverview + 1))} disabled={currentPageOverview === totalPagesOverview}>{">"}</button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === "edit" ? "Edit Komponen Payroll" : "Tambah Komponen Payroll"}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setFormOpen(false)} disabled={loading}>Batal</Button>
            <Button variant="primary" size="md" onClick={() => void saveComponent()} disabled={loading}>
              {loading ? "Menyimpan..." : formMode === "edit" ? "Simpan Perubahan" : "Tambah Komponen"}
            </Button>
          </>
        }
      >
        <div className="payroll-component-form">
          <label>
            Payroll
            <select className="crud-input" value={payrollId} onChange={(event) => setPayrollId(event.target.value)} disabled={formMode === "edit"}>
              <option value="">Pilih Payroll</option>
              {availablePayrolls.map((payroll) => (
                <option key={payroll.id} value={String(payroll.id)}>{getPayrollLabel(payroll)}</option>
              ))}
            </select>
          </label>
          <label>
            Tipe Komponen
            <select className="crud-input" value={detailType} onChange={(event) => setDetailType(event.target.value as PayrollComponentType)} disabled={isLockedMode}>
              <option value="allowance">Tunjangan</option>
              <option value="deduction">Potongan</option>
            </select>
          </label>
          <label>
            Nama Komponen
            <input className="crud-input" placeholder="Contoh: Tunjangan Transport" value={detailName} onChange={(event) => setDetailName(event.target.value)} />
          </label>
          <label>
            Jumlah
            <input className="crud-input" type="text" inputMode="numeric" min="0" placeholder="0" value={detailAmount ? Number(detailAmount).toLocaleString("id-ID") : ""} onChange={(event) => setDetailAmount(event.target.value.replace(/\D/g, ""))} />
          </label>
        </div>
      </Modal>

      <Modal isOpen={!!viewDetail} onClose={() => setViewDetail(null)} title="Detail Komponen Payroll" size="sm">
        <div className="payroll-component-detail">
          <div><span>ID</span><strong>#{String(viewDetail?.id || "-")}</strong></div>
          <div><span>Payroll</span><strong>#{String(viewDetail?.payroll_id || payrollId || "-")}</strong></div>
          <div><span>Nama</span><strong>{viewDetail?.name || viewDetail?.description || "-"}</strong></div>
          <div><span>Tipe</span><strong>{String(viewDetail?.type || "").toLowerCase() === "deduction" ? "Potongan" : "Tunjangan"}</strong></div>
          <div><span>Jumlah</span><strong>Rp {Number(viewDetail?.amount || 0).toLocaleString("id-ID")}</strong></div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Hapus Komponen Payroll"
        message={`Komponen "${detailName || "ini"}" akan dihapus dari payroll. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={loading}
        onConfirm={() => void deleteSingle()}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
};

export type { PayrollComponentType };
export default PayrollDetailsPage;
