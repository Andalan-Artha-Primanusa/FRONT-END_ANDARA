import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, CheckCircle2, Clock3, CreditCard, ShieldCheck,
  RefreshCw, CheckCircle, Eye, UserCheck, Shield, XCircle, AlertTriangle
} from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { PaginationWithSize } from "@/shared/ui/Pagination";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { showToast } from "@/shared/ui/toast";
import { PayrollStatusBadge } from "@/shared/ui/PayrollStatusBadge";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import { payrollService, toSafeArray } from "@/features/payroll/api/payroll.service";
import { getAllEmployees } from "@/features/employee/api/employee.service";
import type { PayrollItem } from "@/features/payroll/types/payroll.types";
import type { EmployeeItem } from "@/features/employee/types/employee.types";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./PayrollListPage.css";
import "./PayrollShared.css";
import "./PayrollApprovePage.css";
import { PageHeader } from "@/shared/ui";

type ApproveAction = "manager-approve" | "hr-approve" | "reject" | null;

const PayrollApprovePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canApprove = RBACUtils.hasPermission(user, PERMISSIONS.PAYROLL_APPROVE);
  const [payrolls, setPayrolls] = useState<PayrollItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);

  // Pagination
  const [currentPageDraft, setCurrentPageDraft] = useState(1);
  const [itemsPerPageDraft, setItemsPerPageDraft] = useState(10);
  const [currentPagePending, setCurrentPagePending] = useState(1);
  const [itemsPerPagePending, setItemsPerPagePending] = useState(10);
  const [currentPageOther, setCurrentPageOther] = useState(1);
  const [itemsPerPageOther, setItemsPerPageOther] = useState(5);

  // State
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollItem | null>(null);
  const [pendingAction, setPendingAction] = useState<ApproveAction>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  // ── Load ─────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [payrollData, employeeData] = await Promise.all([
        payrollService.getPayrollList(),
        getAllEmployees(),
      ]);
      setPayrolls(toSafeArray(payrollData));
      setEmployees(toSafeArray(employeeData));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  // ── Helpers ──────────────────────────────────────────────
  const getEmployeeName = (empId: string | number) => {
    const emp = employees.find((e) => String(e.id) === String(empId));
    return emp ? `${emp.employee_code} - ${emp.user?.name || "Unknown"}` : "Unknown";
  };

  const fmt = (val: string | number | undefined) =>
    `Rp ${Number(val || 0).toLocaleString("id-ID")}`;

  // ── Actions ───────────────────────────────────────────────
  const openAction = (payroll: PayrollItem, action: ApproveAction) => {
    setSelectedPayroll(payroll);
    setPendingAction(action);
    setRejectReason("");
  };

  const closeModal = () => {
    setSelectedPayroll(null);
    setPendingAction(null);
    setRejectReason("");
  };

  const handleConfirm = async () => {
    if (!selectedPayroll || !pendingAction) return;
    if (pendingAction === "reject" && !rejectReason.trim()) {
      showToast("Alasan penolakan wajib diisi", "error");
      return;
    }

    setLoading(true);
    try {
      const id = String(selectedPayroll.id);
      if (pendingAction === "manager-approve") {
        await payrollService.managerApprovePayroll(id);
        showToast(`Payroll #${id} berhasil disetujui Manajer → menunggu HR`, "success");
      } else if (pendingAction === "hr-approve") {
        await payrollService.hrApprovePayroll(id);
        showToast(`Payroll #${id} disetujui HR → siap dibayar`, "success");
      } else if (pendingAction === "reject") {
        await payrollService.rejectPayroll(id, rejectReason);
        showToast(`Payroll #${id} ditolak`, "success");
      }
      closeModal();
      await loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Operasi gagal", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering & Pagination ────────────────────────────────
  const safe = Array.isArray(payrolls) ? payrolls : [];
  const draftPayrolls    = safe.filter((p) => p.status === "draft");
  const pendingPayrolls  = safe.filter((p) => p.status === "pending_hr");
  const approvedPayrolls = safe.filter((p) => p.status === "approved" || p.status === "paid");
  const rejectedPayrolls = safe.filter((p) => p.status === "rejected");

  const paginate = (arr: PayrollItem[], page: number, size: number) =>
    arr.slice((page - 1) * size, page * size);

  const paginatedDraft   = paginate(draftPayrolls, currentPageDraft, itemsPerPageDraft);
  const paginatedPending = paginate(pendingPayrolls, currentPagePending, itemsPerPagePending);
  const paginatedOther   = paginate(approvedPayrolls, currentPageOther, itemsPerPageOther);

  // ── Summary cards ─────────────────────────────────────────
  const summaryCards = [
    { label: "Menunggu Manager", subtitle: "Status: draft", value: String(draftPayrolls.length), tone: "orange" as const, icon: Clock3 },
    { label: "Menunggu HR", subtitle: "Status: pending_hr", value: String(pendingPayrolls.length), tone: "blue" as const, icon: BarChart3 },
    { label: "Disetujui", subtitle: "Status: approved", value: String(approvedPayrolls.filter(p => p.status === "approved").length), tone: "green" as const, icon: CheckCircle2 },
    { label: "Dibayar", subtitle: "Status: paid", value: String(approvedPayrolls.filter(p => p.status === "paid").length), tone: "purple" as const, icon: CreditCard },
  ];

  // ── Shared table row renderer ─────────────────────────────
  const renderRow = (p: PayrollItem, actions: React.ReactNode) => (
    <tr key={p.id}>
      <td>
        <div className="crud-table-avatar">{getEmployeeName(p.employee_id).charAt(0).toUpperCase()}</div>
        <span>{getEmployeeName(p.employee_id)}</span>
      </td>
      <td><span className="crud-table-tag">{p.period}</span></td>
      <td className="crud-table-amount">{fmt(p.basic_salary)}</td>
      <td className="crud-table-amount crud-table-amount-green">{fmt(p.take_home_pay || p.net_salary)}</td>
      <td><PayrollStatusBadge status={p.status} size="sm" /></td>
      <td className="text-center">
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>{actions}</div>
      </td>
    </tr>
  );

  // ── Modal content ─────────────────────────────────────────
  const modalTitle =
    pendingAction === "manager-approve" ? "Konfirmasi — Manager Approve" :
    pendingAction === "hr-approve" ? "Konfirmasi — HR Final Approve" :
    "Konfirmasi — Tolak Payroll";

  const modalIcon =
    pendingAction === "reject" ? <XCircle size={40} color="#ef4444" /> :
    pendingAction === "hr-approve" ? <Shield size={40} color="var(--color-primary)" /> :
    <UserCheck size={40} color="#10b981" />;

  return (
    <div className="crud-page">
      <PageHeader
        title="Persetujuan Payroll"
        subtitle="Alur approval: Manager (draft → pending_hr) → HR (pending_hr → approved) → Finance bayar."
        badge={{ icon: ShieldCheck, label: "Pusat Payroll" }}
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Segarkan
            </button>
            <button className="btn-outline" onClick={() => navigate("/payroll/payment")}
              style={{ color: "var(--color-primary)", borderColor: "var(--color-primary)" }}>
              Halaman Pembayaran
            </button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="payroll-summary-wrapper">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="payroll-summary-card">
              <div className="payroll-summary-header">
                <div>
                  <p className="payroll-summary-label">{card.label}</p>
                  <p className="payroll-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`payroll-summary-icon-wrapper payroll-icon-${card.tone}`}><Icon size={28} /></div>
              </div>
              <div className={`payroll-summary-value payroll-value-${card.tone}`}>{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Menunggu Manager (draft) ── */}
      <Card className="data-table-card">
        <div className="data-table-header">
          <h3 className="data-table-title">
            <UserCheck size={18} style={{ marginRight: 6, color: "#f59e0b" }} />
            Step 1 — Menunggu Persetujuan Manager
            <span className="data-table-count">{draftPayrolls.length} payroll</span>
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 4 }}>
            Manager menyetujui terlebih dahulu sebelum HR melakukan final approval.
          </p>
        </div>
        <div className="table-wrap">
          <table className="crud-table">
            <thead><tr>
              <th>Karyawan</th><th>Periode</th>
              <th className="text-right">Gaji Pokok</th>
              <th className="text-right">Gaji Bersih</th>
              <th className="text-center">Status</th>
              <th className="text-center">Aksi</th>
            </tr></thead>
            <tbody>
              {paginatedDraft.length > 0 ? paginatedDraft.map((p) => renderRow(p,
                <>
                  <button className="action-btn" title="Lihat" onClick={() => navigate(`/payroll/${p.id}`)}><Eye size={14} /></button>
                  {canApprove && (
                  <button className="action-btn action-btn-success" title="Manager Approve"
                    onClick={() => openAction(p, "manager-approve")} disabled={loading}>
                    <UserCheck size={14} />
                  </button>
                  )}
                  {canApprove && (
                  <button className="action-btn action-btn-danger" title="Tolak"
                    onClick={() => openAction(p, "reject")} disabled={loading}>
                    <XCircle size={14} />
                  </button>
                  )}
                </>
              )) : (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                  Tidak ada payroll draft yang menunggu Manager.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {draftPayrolls.length > itemsPerPageDraft && (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <PaginationWithSize currentPage={currentPageDraft} totalPages={Math.ceil(draftPayrolls.length / itemsPerPageDraft)}
              onPageChange={setCurrentPageDraft} totalItems={draftPayrolls.length}
              itemsPerPage={itemsPerPageDraft} onItemsPerPageChange={setItemsPerPageDraft} />
          </div>
        )}
      </Card>

      {/* ── Step 2: Menunggu HR (pending_hr) ── */}
      <Card className="data-table-card">
        <div className="data-table-header">
          <h3 className="data-table-title">
            <Shield size={18} style={{ marginRight: 6, color: "var(--color-primary)" }} />
            Step 2 — Menunggu Final Approval HR
            <span className="data-table-count">{pendingPayrolls.length} payroll</span>
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 4 }}>
            Sudah disetujui Manager. HR melakukan verifikasi akhir.
          </p>
        </div>
        <div className="table-wrap">
          <table className="crud-table">
            <thead><tr>
              <th>Karyawan</th><th>Periode</th>
              <th className="text-right">Gaji Pokok</th>
              <th className="text-right">Gaji Bersih</th>
              <th className="text-center">Status</th>
              <th className="text-center">Aksi</th>
            </tr></thead>
            <tbody>
              {paginatedPending.length > 0 ? paginatedPending.map((p) => renderRow(p,
                <>
                  <button className="action-btn" title="Lihat" onClick={() => navigate(`/payroll/${p.id}`)}><Eye size={14} /></button>
                  {canApprove && (
                  <button className="action-btn action-btn-success" title="HR Final Approve"
                    onClick={() => openAction(p, "hr-approve")} disabled={loading}>
                    <Shield size={14} />
                  </button>
                  )}
                  {canApprove && (
                  <button className="action-btn action-btn-danger" title="Tolak"
                    onClick={() => openAction(p, "reject")} disabled={loading}>
                    <XCircle size={14} />
                  </button>
                  )}
                </>
              )) : (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                  Tidak ada payroll yang menunggu HR approval.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pendingPayrolls.length > itemsPerPagePending && (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <PaginationWithSize currentPage={currentPagePending} totalPages={Math.ceil(pendingPayrolls.length / itemsPerPagePending)}
              onPageChange={setCurrentPagePending} totalItems={pendingPayrolls.length}
              itemsPerPage={itemsPerPagePending} onItemsPerPageChange={setItemsPerPagePending} />
          </div>
        )}
      </Card>

      {/* ── Rejected ── */}
      {rejectedPayrolls.length > 0 && (
        <Card className="data-table-card">
          <div className="data-table-header">
            <h3 className="data-table-title">
              <AlertTriangle size={18} style={{ marginRight: 6, color: "#ef4444" }} />
              Ditolak
              <span className="data-table-count">{rejectedPayrolls.length} payroll</span>
            </h3>
          </div>
          <div className="table-wrap">
            <table className="crud-table">
              <thead><tr>
                <th>Karyawan</th><th>Periode</th>
                <th className="text-right">Gaji Bersih</th>
                <th className="text-center">Status</th>
                <th>Alasan</th>
              </tr></thead>
              <tbody>
                {rejectedPayrolls.map((p) => (
                  <tr key={p.id}>
                    <td className="crud-table-name">
                      <div className="crud-table-avatar">{getEmployeeName(p.employee_id).charAt(0).toUpperCase()}</div>
                      <span>{getEmployeeName(p.employee_id)}</span>
                    </td>
                    <td><span className="crud-table-tag">{p.period}</span></td>
                    <td className="crud-table-amount">{fmt(p.take_home_pay || p.net_salary)}</td>
                    <td><PayrollStatusBadge status={p.status} size="sm" /></td>
                    <td style={{ fontSize: "0.82rem", color: "#64748b" }}>{p.rejected_reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Approved / Paid ── */}
      {approvedPayrolls.length > 0 && (
        <Card className="data-table-card">
          <div className="data-table-header">
            <h3 className="data-table-title">
              <CheckCircle2 size={18} style={{ marginRight: 6, color: "#10b981" }} />
              Sudah Disetujui / Dibayar
              <span className="data-table-count">{approvedPayrolls.length} payroll</span>
            </h3>
          </div>
          <div className="table-wrap">
            <table className="crud-table">
              <thead><tr>
                <th>Karyawan</th><th>Periode</th>
                <th className="text-right">Gaji Bersih</th>
                <th className="text-center">Status</th>
              </tr></thead>
              <tbody>
                {paginatedOther.map((p) => (
                  <tr key={p.id}>
                    <td className="crud-table-name">
                      <div className="crud-table-avatar">{getEmployeeName(p.employee_id).charAt(0).toUpperCase()}</div>
                      <span>{getEmployeeName(p.employee_id)}</span>
                    </td>
                    <td><span className="crud-table-tag">{p.period}</span></td>
                    <td className="crud-table-amount crud-table-amount-green">{fmt(p.take_home_pay || p.net_salary)}</td>
                    <td><PayrollStatusBadge status={p.status} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {approvedPayrolls.length > itemsPerPageOther && (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <PaginationWithSize currentPage={currentPageOther} totalPages={Math.ceil(approvedPayrolls.length / itemsPerPageOther)}
                onPageChange={setCurrentPageOther} totalItems={approvedPayrolls.length}
                itemsPerPage={itemsPerPageOther} onItemsPerPageChange={setItemsPerPageOther} />
            </div>
          )}
        </Card>
      )}

      {/* ── Action Modal ── */}
      <Modal
        isOpen={!!selectedPayroll && !!pendingAction}
        onClose={closeModal}
        title={modalTitle}
        size="md"
      >
        {selectedPayroll && (
          <div style={{ padding: "8px 0" }}>
            {/* Icon */}
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>{modalIcon}</div>

            {/* Info */}
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>Karyawan</p>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{getEmployeeName(selectedPayroll.employee_id)}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>Periode</p>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{selectedPayroll.period}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>Gaji Pokok</p>
                <p style={{ margin: 0, fontWeight: 600, color: "#10b981" }}>{fmt(selectedPayroll.basic_salary)}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>Take Home Pay</p>
                <p style={{ margin: 0, fontWeight: 700, color: "#10b981", fontSize: "1rem" }}>{fmt(selectedPayroll.take_home_pay || selectedPayroll.net_salary)}</p>
              </div>
            </div>

            {/* Description */}
            {pendingAction !== "reject" && (
              <div style={{ background: pendingAction === "hr-approve" ? "#eff6ff" : "#f0fdf4", border: `1px solid ${pendingAction === "hr-approve" ? "var(--color-primary-light)" : "#bbf7d0"}`, borderRadius: 8, padding: "0.875rem 1rem", marginBottom: "1.25rem", fontSize: "0.875rem", color: "#1e293b" }}>
                {pendingAction === "manager-approve"
                  ? "Anda akan menyetujui payroll ini sebagai Manager. Status akan berubah ke pending_hr dan diteruskan ke HR untuk final approval."
                  : "Anda akan memberikan final approval sebagai HR. Status akan berubah ke approved dan siap untuk proses pembayaran."}
              </div>
            )}

            {/* Reject reason textarea */}
            {pendingAction === "reject" && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  Alasan Penolakan <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Jelaskan alasan penolakan payroll ini..."
                  rows={4}
                  style={{
                    width: "100%", padding: "0.75rem", borderRadius: 8, border: "1.5px solid #e2e8f0",
                    fontSize: "0.875rem", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box",
                    outline: "none", color: "#1e293b", background: "#fff"
                  }}
                />
                <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                  Alasan ini akan dicatat dan dapat dilihat oleh HR dan Admin.
                </p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="outline" size="md" onClick={closeModal} disabled={loading}>Batal</Button>
              {canApprove && (
              <>
              {pendingAction === "reject" ? (
                <Button variant="danger" size="md" onClick={() => void handleConfirm()} disabled={loading || !rejectReason.trim()}>
                  <XCircle size={16} style={{ marginRight: 6 }} /> Tolak Payroll
                </Button>
              ) : (
                <Button variant="success" size="md" onClick={() => void handleConfirm()} disabled={loading}>
                  <CheckCircle size={16} style={{ marginRight: 6 }} />
                  {pendingAction === "manager-approve" ? "Manager Approve" : "HR Final Approve"}
                </Button>
              )}
              </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayrollApprovePage;
