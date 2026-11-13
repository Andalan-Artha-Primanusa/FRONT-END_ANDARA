import { useEffect, useState, useMemo } from "react";
import { Card, PageHeader } from "@/shared/ui";
import { LoadingState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { approveLeave, getPendingLeaves, rejectLeave, returnLeave } from "@/features/leave/api/leave.service";
import { RejectLeaveModal } from "@/features/leave/components/RejectLeaveModal";
import { ReturnLeaveModal } from "@/features/leave/components/ReturnLeaveModal";
import type { LeaveItem } from "@/features/leave/types/leave.types";
import { RefreshCw, Check, X, Clock3, CheckCircle2, XCircle, Search, History, Undo2 } from "lucide-react";
import { showToast } from "@/shared/ui/toast";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "@/pages/leave/LeaveApprovalPage.css";
import "@/pages/admin/AdminPermissionsPage.css";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";

const formatDate = (dateString: unknown) => {
  if (typeof dateString !== "string" || !dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const getLeaveTypeLabel = (type: unknown) => {
  const typeStr = typeof type === "string" ? type : "";
  const typeMap: Record<string, string> = {
    annual: "Cuti Tahunan",
    sick: "Cuti Sakit",
    personal: "Cuti Pribadi",
    unpaid: "Cuti Tanpa Gaji",
  };
  const mapped = typeMap[typeStr.toLowerCase()];
  if (mapped) return mapped;
  return typeStr ? typeStr : "-";
};

const getEmployeeName = (leave: unknown): string => {
  const item = leave && typeof leave === "object" ? (leave as Record<string, unknown>) : {};
  if (typeof item.employee === "string") return item.employee;
  if (typeof item.employee_name === "string") return item.employee_name;

  const empObj = item.employee && typeof item.employee === "object" ? (item.employee as Record<string, unknown>) : {};
  if (typeof empObj.name === "string") return empObj.name;

  const empUserObj = empObj.user && typeof empObj.user === "object" ? (empObj.user as Record<string, unknown>) : {};
  if (typeof empUserObj.name === "string") return empUserObj.name;

  const userObj = item.user && typeof item.user === "object" ? (item.user as Record<string, unknown>) : {};
  if (typeof userObj.name === "string") return userObj.name;

  if (typeof empObj.employee_code === "string") return empObj.employee_code;
  return "-";
};

const LeaveApprovalPage = () => {
  const user = useAuthStore((state) => state.user);
  const allowedMenuKeys = useAuthStore((state) => state.allowedMenuKeys);

  // Otorisasi dinamis via kapabilitas
  const canApproveLeave =
    RBACUtils.hasPermission(user, "leave.approve") ||
    allowedMenuKeys.includes("cuti.persetujuan") ||
    allowedMenuKeys.includes("leave.approval");

  const [items, setItems] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search & Filter
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"Semua" | "Pending" | "Approved" | "Rejected">("Semua");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number | string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string | number; name: string } | null>(null);
  const [returnModal, setReturnModal] = useState<{ id: string | number; name: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getPendingLeaves(currentPage, pageSize);
      const raw = Array.isArray(result.items) ? result.items : [];
      setItems(raw);
      setTotalPages(result.totalPages ?? 1);
      setTotalItems(result.total ?? raw.length);
    } catch (error: unknown) {
      console.error("Failed to load leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [currentPage, pageSize]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const empName = getEmployeeName(item).toLowerCase();
      const query = searchText.toLowerCase();
      const matchSearch = empName.includes(query);

      let statusMatch = true;
      const statusStr = typeof item.status === "string" ? item.status : "";
      if (activeTab === "Pending") statusMatch = statusStr === "pending" || statusStr === "submitted";
      else if (activeTab === "Approved") statusMatch = statusStr === "approved";
      else if (activeTab === "Rejected") statusMatch = statusStr === "rejected";

      return matchSearch && statusMatch;
    });
  }, [items, searchText, activeTab]);

  const paginatedItems = filteredItems;

  const summaryStats = useMemo(() => {
    const pending = items.filter((i) => i.status === "pending" || i.status === "submitted").length;
    const approved = items.filter((i) => i.status === "approved").length;
    const rejected = items.filter((i) => i.status === "rejected").length;

    return [
      { label: "Pending", subtitle: "Menunggu persetujuan", value: pending, tone: "blue" as const },
      { label: "Disetujui", subtitle: "Pengajuan disetujui", value: approved, tone: "green" as const },
      { label: "Ditolak", subtitle: "Pengajuan ditolak", value: rejected, tone: "red" as const },
    ];
  }, [items]);

  const handleApprove = async (leaveId: string | number) => {
    setActionLoading(String(leaveId));
    try {
      await approveLeave(String(leaveId), { note: "Disetujui" });
      await loadData();
      showToast("Pengajuan disetujui", "success");
    } catch (error: unknown) {
      console.error("Failed to approve:", error);
      const errObj = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
      const responseObj = errObj.response && typeof errObj.response === "object" ? (errObj.response as Record<string, unknown>) : {};
      const dataObj = responseObj.data && typeof responseObj.data === "object" ? (responseObj.data as Record<string, unknown>) : {};
      const msg = typeof dataObj.message === "string" ? dataObj.message : typeof errObj.message === "string" ? errObj.message : "Gagal menyetujui cuti";
      showToast(msg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectModal) return;
    const leaveId = rejectModal.id;
    setActionLoading(String(leaveId));
    try {
      await rejectLeave(String(leaveId), { note: reason });
      await loadData();
      showToast("Pengajuan ditolak", "success");
      setRejectModal(null);
    } catch (error: unknown) {
      console.error("Failed to reject:", error);
      const errObj = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
      const responseObj = errObj.response && typeof errObj.response === "object" ? (errObj.response as Record<string, unknown>) : {};
      const dataObj = responseObj.data && typeof responseObj.data === "object" ? (responseObj.data as Record<string, unknown>) : {};
      const msg = typeof dataObj.message === "string" ? dataObj.message : typeof errObj.message === "string" ? errObj.message : "Gagal menolak cuti";
      showToast(msg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReturn = async (reason: string) => {
    if (!returnModal) return;
    const leaveId = returnModal.id;
    setActionLoading(String(leaveId));
    try {
      await returnLeave(String(leaveId), { note: reason });
      await loadData();
      showToast("Pengajuan dikembalikan untuk revisi", "success");
      setReturnModal(null);
    } catch (error: unknown) {
      console.error("Failed to return leave:", error);
      const errObj = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
      const responseObj = errObj.response && typeof errObj.response === "object" ? (errObj.response as Record<string, unknown>) : {};
      const dataObj = responseObj.data && typeof responseObj.data === "object" ? (responseObj.data as Record<string, unknown>) : {};
      const msg = typeof dataObj.message === "string" ? dataObj.message : "Gagal mengembalikan cuti";
      showToast(msg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const getStatusClass = (status?: unknown) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "approved") return "status-badge status-badge--approved";
    if (normalized === "submitted" || normalized === "pending") return "status-badge status-badge--pending";
    if (normalized === "rejected") return "status-badge status-badge--draft";
    if (normalized === "returned") return "status-badge status-badge--returned";
    return "status-badge status-badge--draft";
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Leave Approval"
        subtitle="Review and approve/reject pending employee leave requests securely."
        badge={{ icon: Clock3, label: "Leave Center" }}
        scope
        actions={
          <button className="btn-outline" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Segarkan
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryStats.map((card) => {
          const Icon = card.tone === "blue" ? Clock3 : card.tone === "green" ? CheckCircle2 : XCircle;

          return (
            <div key={card.label} className="employee-summary-card">
              <div className="employee-summary-header">
                <div>
                  <p className="employee-summary-label">{card.label}</p>
                  <p className="employee-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`employee-summary-icon-wrapper employee-icon-${card.tone}`}>
                  <Icon size={28} />
                </div>
              </div>
              <div className={`employee-summary-value employee-value-${card.tone}`}>{card.value}</div>
              <p className="employee-summary-trend">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Clock3 size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Pengajuan Cuti</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua pengajuan cuti karyawan</p>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <div className="table-section leave-approval-table-section">
        <div className="wuw-table-area leave-approval-table-area">
          <div className="table-toolbar leave-approval-table-toolbar">
            <div className="control-section-inner">
              {/* Tabs */}
              <div className="elyra-tabs">
                {["Semua", "Pending", "Approved", "Rejected"].map((tab) => (
                  <button
                    key={tab}
                    className={`elyra-tab ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab as "Semua" | "Pending" | "Approved" | "Rejected")}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="control-actions">
                <div className="search-box">
                  <div className="search-icon-inside">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari karyawan..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="search-input-pill"
                  />
                </div>
              </div>
            </div>
          </div>
          {loading && <LoadingState message="Memuat pengajuan cuti..." />}

          {!loading && paginatedItems.length === 0 && (
            <div style={{ padding: "5rem 0" }}>
              <EmptyState
                title="Belum Ada Pengajuan"
                message={
                  searchText || activeTab !== "Semua"
                    ? "Tidak ada pengajuan yang sesuai dengan kriteria Anda."
                    : "Tidak ada pengajuan cuti yang perlu disetujui."
                }
                actionLabel="Segarkan"
                onAction={() => void loadData()}
              />
            </div>
          )}

          {!loading && paginatedItems.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "250px" }}>Karyawan</th>
                      <th>Tipe Cuti</th>
                      <th>Tanggal</th>
                      <th>Hari</th>
                      <th>Alasan</th>
                      <th className="th-center">Status</th>
                      {canApproveLeave && (
                        <th className="th-center" style={{ width: "140px" }}>
                          Aksi
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item, index) => {
                      const empObj = item && typeof item.employee === "object" && item.employee ? (item.employee as Record<string, unknown>) : {};
                      const empCode = typeof empObj.employee_code === "string" ? empObj.employee_code : String(item.id ?? index);
                      const itemId = typeof item.id === "string" || typeof item.id === "number" ? item.id : index;

                      return (
                        <tr key={String(itemId)}>
                          <td>
                            <div className="cell-name">
                              <div className="cell-avatar">
                                {getEmployeeName(item).charAt(0).toUpperCase()}
                              </div>
                              <div className="cell-stacked">
                                <span className="cell-name-text">{getEmployeeName(item)}</span>
                                <span className="cell-stacked__sub">{empCode}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge-soft badge-soft--blue">
                              {getLeaveTypeLabel(item.type)}
                            </span>
                          </td>
                          <td>
                            <div className="cell-stacked">
                              <span className="cell-stacked__main" style={{ fontSize: "0.85rem" }}>
                                {formatDate(item.start_date)}
                              </span>
                              <span className="cell-stacked__sub">hingga {formatDate(item.end_date)}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: "#1e293b" }}>
                              {String(item.total_days || 1)} hari
                            </span>
                          </td>
                          <td
                            style={{
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {typeof item.reason === "string" ? item.reason : "-"}
                          </td>
                          <td className="td-center">
                            <span className={getStatusClass(item.status)}>
                              {item.status === "approved"
                                ? "Approved"
                                : item.status === "submitted" || item.status === "pending"
                                  ? "Pending"
                                  : item.status === "returned"
                                    ? "Dikembalikan"
                                    : "Rejected"}
                            </span>
                          </td>
                          {canApproveLeave && (
                            <td className="td-center">
                              <div className="action-btn-group">
                                {(item.status === "pending" || item.status === "submitted") &&
                                item.can_act !== false ? (
                                  <>
                                    <button
                                      className="action-btn"
                                      style={{ color: "#10b981" }}
                                      onClick={() => handleApprove(itemId)}
                                      disabled={actionLoading === String(itemId)}
                                      title="Setujui"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      className="action-btn action-btn-delete"
                                      onClick={() =>
                                        setRejectModal({
                                          id: String(itemId),
                                          name: getEmployeeName(item),
                                        })
                                      }
                                      disabled={actionLoading === String(itemId)}
                                      title="Tolak"
                                    >
                                      <X size={16} />
                                    </button>
                                  </>
                                ) : null}
                                {(item.status === "pending" || item.status === "submitted") &&
                                item.can_act !== false ? (
                                  <button
                                    className="action-btn"
                                    style={{ color: "#d97706", background: "#fffbeb" }}
                                    onClick={() =>
                                      setReturnModal({
                                        id: String(itemId),
                                        name: getEmployeeName(item),
                                      })
                                    }
                                    disabled={actionLoading === String(itemId)}
                                    title="Kembalikan untuk Revisi"
                                  >
                                    <Undo2 size={16} />
                                  </button>
                                ) : null}
                                <button
                                  className="action-btn"
                                  style={{ color: "#8b5cf6", background: "#f5f3ff" }}
                                  onClick={() => setHistoryModal({ module: "leave", id: String(itemId) })}
                                  title="Riwayat Approval"
                                >
                                  <History size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
                <div className="table-pagination">
                <div className="pagination-info">
                  {totalItems === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalItems)} dari ${totalItems} data`}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {historyModal && (
        <ApprovalHistoryModal
          isOpen={!!historyModal}
          onClose={() => setHistoryModal(null)}
          module={historyModal.module}
          moduleId={historyModal.id}
        />
      )}

      <RejectLeaveModal
        isOpen={!!rejectModal}
        onClose={() => setRejectModal(null)}
        onConfirm={handleConfirmReject}
        employeeName={rejectModal?.name}
        loading={!!actionLoading}
      />

      <ReturnLeaveModal
        isOpen={!!returnModal}
        onClose={() => setReturnModal(null)}
        onConfirm={handleConfirmReturn}
        employeeName={returnModal?.name}
        loading={!!actionLoading}
      />
    </div>
  );
};

export default LeaveApprovalPage;
