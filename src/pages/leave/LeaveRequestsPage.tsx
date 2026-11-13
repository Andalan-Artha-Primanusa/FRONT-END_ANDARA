import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, ConfirmDialog, PageHeader } from "@/shared/ui";
import { LoadingState, EmptyState } from "@/shared/ui/DataStateDisplay";
import {
  getAllLeaves,
  deleteLeaveRequest,
  approveLeave,
  rejectLeave,
} from "@/features/leave/api/leave.service";
import type { LeaveItem } from "@/features/leave/types/leave.types";
import { LeaveSummary } from "@/features/leave/components/LeaveSummary";
import { LeaveTable } from "@/features/leave/components/LeaveTable";
import { LeaveDetailModal } from "@/features/leave/components/LeaveDetailModal";
import { RejectLeaveModal } from "@/features/leave/components/RejectLeaveModal";
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";
import { Plus, RefreshCw, Search, Calendar } from "lucide-react";
import { showToast } from "@/shared/ui/toast";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./LeaveShared.css";

const LeaveRequestsPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const allowedMenuKeys = useAuthStore((state) => state.allowedMenuKeys);

  // Otorisasi dinamis menghindari hardcode array role statis
  const canApproveLeave =
    RBACUtils.hasPermission(user, "leave.approve") ||
    allowedMenuKeys.includes("cuti.persetujuan") ||
    allowedMenuKeys.includes("leave.approval");

  const [items, setItems] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDetail, setSelectedDetail] = useState<LeaveItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number | string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const perPage = 10;

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const result = await getAllLeaves(currentPage, perPage);
      setItems(Array.isArray(result.items) ? result.items : []);
      setTotalPages(result.totalPages ?? 1);
    } catch (err: unknown) {
      const errorObj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
      showToast(typeof errorObj.message === "string" ? errorObj.message : "Gagal memuat pengajuan cuti", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setLoading(true);
    try {
      await approveLeave(id, { note: "Disetujui melalui manajemen" });
      showToast("Pengajuan cuti disetujui", "success");
      await loadLeaves();
      setIsDetailModalOpen(false);
    } catch (err: unknown) {
      const errorObj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
      showToast(typeof errorObj.message === "string" ? errorObj.message : "Gagal menyetujui", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (id: string) => {
    setRejectTarget(id);
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setLoading(true);
    try {
      await rejectLeave(rejectTarget, { note: reason || "Ditolak melalui manajemen" });
      showToast("Pengajuan cuti ditolak", "success");
      await loadLeaves();
      setIsDetailModalOpen(false);
      setRejectTarget(null);
    } catch (err: unknown) {
      const errorObj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
      showToast(typeof errorObj.message === "string" ? errorObj.message : "Gagal menolak", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteLeaveRequest(String(deleteTarget.id));
      showToast("Pengajuan berhasil dihapus", "success");
      await loadLeaves();
      setDeleteTarget(null);
    } catch (err: unknown) {
      const errorObj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
      showToast(typeof errorObj.message === "string" ? errorObj.message : "Gagal menghapus", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenDetail = (item: unknown) => {
    if (item && typeof item === "object") {
      setSelectedDetail(item as LeaveItem);
      setIsDetailModalOpen(true);
    }
  };

  useEffect(() => {
    void loadLeaves();
  }, [currentPage, perPage]);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => String(i.status || "").toLowerCase() === "pending").length;
    const approved = items.filter((i) => String(i.status || "").toLowerCase() === "approved").length;
    const rejected = items.filter((i) => String(i.status || "").toLowerCase() === "rejected").length;
    return { total, pending, approved, rejected };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase();
      const emp = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const empSub = emp.employee && typeof emp.employee === "object" ? (emp.employee as Record<string, unknown>) : {};
      const userSub = emp.user && typeof emp.user === "object" ? (emp.user as Record<string, unknown>) : {};

      const name = String(empSub.full_name || emp.employee_name || userSub.name || "").toLowerCase();
      const id = String(emp.employee_id || emp.id || "").toLowerCase();
      const status = String(emp.status || "").toLowerCase();

      const matchesSearch = name.includes(q) || id.includes(q);
      const matchesStatus = !filterStatus || status === filterStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, filterStatus]);

  const [totalPages, setTotalPages] = useState(1);

  const paginatedItems = filteredItems;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  return (
    <div className="crud-page">
      <PageHeader
        title="Leave Requests"
        subtitle="Manage employee leave requests and approvals in one unified dashboard."
        badge={{ icon: Calendar, label: "Leave Center" }}
        scope
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadLeaves()}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={() => navigate("/leave/requests/create")}>
              <Plus size={16} />
              Buat Pengajuan
            </button>
          </>
        }
      />

      <LeaveSummary stats={stats} />

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Pengajuan Cuti</h2>
            <p className="analytics-subtitle">Kelola semua pengajuan cuti karyawan</p>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <div className="table-section leave-requests-table-section">
        <div className="wuw-table-area leave-requests-table-area">
          <div className="table-toolbar leave-requests-table-toolbar">
            <div className="control-section-inner">
              <div className="control-actions">
                <select
                  className="control-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="approved">Disetujui</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>

              <div className="control-actions">
                <div className="search-box">
                  <div className="search-icon-inside">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari nama atau ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-pill"
                  />
                </div>
              </div>
            </div>
          </div>
          {loading && items.length === 0 ? (
            <LoadingState message="Memuat data cuti..." />
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <EmptyState title="Tidak ada pengajuan" message="Tidak ada data pengajuan cuti yang sesuai." />
            </div>
          ) : (
            <LeaveTable
              items={paginatedItems}
              onView={handleOpenDetail}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={(id) => navigate(`/leave/requests/edit/${id}`)}
              onDelete={(id) => {
                const item = items.find((entry) => String(entry.id) === String(id)) || null;
                setDeleteTarget(item);
              }}
              onHistory={(id) => setHistoryModal({ module: "leave", id })}
              canApproveLeave={canApproveLeave}
            />
          )}
          {totalPages > 1 && (
            <div className="table-pagination">
              <div className="pagination-info">
                {filteredItems.length === 0
                  ? 'Menampilkan 0 data'
                  : `Menampilkan ${(currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, filteredItems.length)} dari ${filteredItems.length} data`}
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <LeaveDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        item={selectedDetail}
        onApprove={handleApprove}
        onReject={handleReject}
        canApproveLeave={canApproveLeave}
      />

      {historyModal && (
        <ApprovalHistoryModal
          isOpen={!!historyModal}
          onClose={() => setHistoryModal(null)}
          module={historyModal.module}
          moduleId={historyModal.id}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Pengajuan Cuti"
        message="Pengajuan cuti ini akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <RejectLeaveModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        loading={loading}
      />
    </div>
  );
};

export default LeaveRequestsPage;
