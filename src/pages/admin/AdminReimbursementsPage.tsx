import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Wallet, Search, Filter, Clock, CheckCircle, XCircle, Eye, Trash2, FileText, History } from 'lucide-react';
import { Card, ConfirmDialog } from '@/shared/ui';
import { Modal } from '@/shared/ui/Modal';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import {
  getAllReimbursements,
  getReimbursementStatistics,
  approveReimbursement,
  rejectReimbursement,
  deleteReimbursement,
} from '@/features/reimbursement/api/reimbursement.service';
import type { ReimbursementItem } from '@/features/reimbursement/types/reimbursement.types';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './AdminReimbursementsPage.css';
import { showToast } from '@/shared/ui/toast';
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import type { HistoryItem } from "@/shared/components/ApprovalHistoryModal";

const formatDateTime = (input?: string) => {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
};

const formatCurrency = (amount: number) => `Rp ${(amount || 0).toLocaleString("id-ID")}`;

const getErrorMessage = (error: unknown, fallback: string) => {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const response = record.response && typeof record.response === "object" ? (record.response as Record<string, unknown>) : {};
  const data = response.data && typeof response.data === "object" ? (response.data as Record<string, unknown>) : {};
  return typeof data.message === "string"
    ? data.message
    : typeof record.message === "string"
      ? record.message
      : fallback;
};

const categoryLabels: Record<string, string> = {
  travel: "Perjalanan",
  medical: "Medis",
  office_supplies: "Perlengkapan Kantor",
  training: "Pelatihan",
  meal: "Makan",
  accommodation: "Akomodasi",
  transportation: "Transportasi",
  other: "Lainnya",
};

const fallbackText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "-";
};

const getEmployeeName = (item: ReimbursementItem) =>
  fallbackText(item.employee?.user?.name, item.employee_name, item.employee?.name, item.user?.name);

const getTitle = (item: ReimbursementItem) => fallbackText(item.title, item.description, `Klaim #${item.id}`);

const getCategoryLabel = (category?: string) => {
  const key = String(category || "other").trim();
  return categoryLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const buildFallbackApprovalHistory = (item: ReimbursementItem): { history: HistoryItem[]; totalSteps: number } => {
  const flow = item.approval_flow ?? item.approvalFlow;
  const steps = [...(flow?.steps ?? [])].sort((a, b) => Number(a.step_order ?? 0) - Number(b.step_order ?? 0));

  if (steps.length > 0) {
    const currentStep = Number(item.current_step || 1);
    const isFinalApproved = item.status === "approved" || item.status === "paid";
    const isRejected = item.status === "rejected";

    return {
      totalSteps: steps.length,
      history: steps.map((step, index) => {
        const stepOrder = Number(step.step_order || index + 1);
        const action =
          isFinalApproved || stepOrder < currentStep
            ? "approved"
            : isRejected && stepOrder === currentStep
              ? "rejected"
              : "pending";

        return {
          id: Number(step.id ?? stepOrder),
          step_order: stepOrder,
          role_id: Number(step.role_id ?? 0),
          user_id: typeof step.user_id === "number" ? step.user_id : undefined,
          action,
          note: action === "rejected" ? item.approval_note : undefined,
          acted_at: action === "pending" ? "" : item.approved_at || item.updated_at || item.submitted_at || "",
          role: step.role,
          user: step.user,
        };
      }),
    };
  }

  if (["approved", "rejected", "paid", "submitted"].includes(item.status)) {
    const action = item.status === "rejected" ? "rejected" : item.status === "submitted" ? "pending" : "approved";
    return {
      totalSteps: 1,
      history: [
        {
          id: Number(item.id) || 1,
          step_order: 1,
          role_id: 0,
          user_id: typeof item.approved_by === "number" ? item.approved_by : undefined,
          action,
          note: item.approval_note,
          acted_at: action === "pending" ? "" : item.approved_at || item.updated_at || "",
          role: { display_name: "Approver", name: "approver" },
          user: item.approver,
        },
      ],
    };
  }

  return { history: [], totalSteps: 0 };
};

const AdminReimbursementsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const canApprove = RBACUtils.hasPermission(user, PERMISSIONS.REIMBURSEMENT_APPROVE);
  const canDelete = RBACUtils.hasPermission(user, "reimbursement.delete");
  const [items, setItems] = useState<ReimbursementItem[]>([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter & Pagination State
  const [activeTab, setActiveTab] = useState<"Semua" | "Draft" | "Submitted" | "Approved" | "Rejected" | "Paid">("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number | string; item: ReimbursementItem } | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReimbursementItem | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReimbursementItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reimbData, statsData] = await Promise.all([
        getAllReimbursements({ page: currentPage, per_page: pageSize }),
        getReimbursementStatistics()
      ]);
      setItems(reimbData.items || []);
      setTotalPages(reimbData.totalPages ?? 1);
      setStats(
        statsData.payload && typeof statsData.payload === "object"
          ? (statsData.payload as Record<string, unknown>)
          : null
      );
    } catch (error) {
      console.error('Failed to fetch reimbursements:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter Logic
  const filteredItems = useMemo(() => {
    return (items || []).filter(item => {
      const searchStr = searchQuery.toLowerCase();
      const titleMatch = getTitle(item).toLowerCase().includes(searchStr);
      const reasonMatch = (item.description || '').toLowerCase().includes(searchStr);
      const empMatch = getEmployeeName(item).toLowerCase().includes(searchStr);
      const textMatch = titleMatch || reasonMatch || empMatch;

      let statusMatch = true;
      if (activeTab === "Draft") statusMatch = item.status === 'draft';
      else if (activeTab === "Submitted") statusMatch = item.status === 'submitted';
      else if (activeTab === "Approved") statusMatch = item.status === 'approved';
      else if (activeTab === "Rejected") statusMatch = item.status === 'rejected';
      else if (activeTab === "Paid") statusMatch = item.status === 'paid';

      return textMatch && statusMatch;
    });
  }, [items, searchQuery, activeTab]);

  // Sort by expense date (newest first)
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const dateA = new Date(a.expense_date || 0).getTime();
      const dateB = new Date(b.expense_date || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredItems]);

  // Paginate
  const paginatedItems = sortedItems;

  const [totalPages, setTotalPages] = useState(1);

  // Summary Cards
  const summaryCards = useMemo(() => [
    {
      label: "Total Klaim",
      subtitle: "Seluruh klaim imbalan",
      value: String(items.length),
      change: "Data tersimpan",
      tone: "blue" as const,
      icon: Wallet,
    },
    {
      label: "Hasil Filter",
      subtitle: "Klaim sesuai pencarian",
      value: String(sortedItems.length),
      change: `${paginatedItems.length} data per halaman`,
      tone: "green" as const,
      icon: Search,
    },
    {
      label: "Pending",
      subtitle: "Menunggu persetujuan",
      value: String(items.filter(i => i.status === 'submitted').length),
      change: "Perlu ditinjau",
      tone: "orange" as const,
      icon: Clock,
    },
    {
      label: "Disetujui",
      subtitle: "Klaim yang disetujui",
      value: String(items.filter(i => i.status === 'approved').length),
      change: "Siap dibayar",
      tone: "purple" as const,
      icon: CheckCircle,
    },
  ], [items, sortedItems.length, paginatedItems.length]);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  const handleViewDetail = (item: ReimbursementItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleApprove = (item: ReimbursementItem) => {
    if (!canApprove || item.can_act === false) {
      showToast("Anda tidak memiliki giliran atau izin menyetujui klaim ini.", "error");
      return;
    }
    setSelectedItem(item);
    setActionNote('');
    setShowApproveModal(true);
  };

  const handleReject = (item: ReimbursementItem) => {
    if (!canApprove || item.can_act === false) {
      showToast("Anda tidak memiliki giliran atau izin menolak klaim ini.", "error");
      return;
    }
    setSelectedItem(item);
    setActionNote('');
    setShowRejectModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedItem) return;
    if (!canApprove || selectedItem.can_act === false) {
      showToast("Anda tidak memiliki giliran atau izin menyetujui klaim ini.", "error");
      return;
    }
    try {
      await approveReimbursement(String(selectedItem.id), { note: actionNote });
      setShowApproveModal(false);
      fetchData();
      showToast('Klaim berhasil disetujui', 'success');
    } catch (error: unknown) {
      console.error('Failed to approve:', error);
      showToast(getErrorMessage(error, 'Gagal menyetujui klaim'), 'error');
    }
  };

  const confirmReject = async () => {
    if (!selectedItem || !actionNote.trim()) return;
    if (!canApprove || selectedItem.can_act === false) {
      showToast("Anda tidak memiliki giliran atau izin menolak klaim ini.", "error");
      return;
    }
    try {
      await rejectReimbursement(String(selectedItem.id), { note: actionNote });
      setShowRejectModal(false);
      fetchData();
      showToast('Klaim berhasil ditolak', 'success');
    } catch (error: unknown) {
      console.error('Failed to reject:', error);
      showToast(getErrorMessage(error, 'Gagal menolak klaim'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteReimbursement(String(deleteTarget.id));
      showToast('Klaim berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (error: unknown) {
      console.error('Failed to delete:', error);
      showToast(getErrorMessage(error, 'Gagal menghapus klaim'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      'draft': { label: 'Draft', class: 'badge-soft--gray' },
      'submitted': { label: 'Submitted', class: 'badge-soft--yellow' },
      'approved': { label: 'Approved', class: 'badge-soft--green' },
      'rejected': { label: 'Rejected', class: 'badge-soft--red' },
      'paid': { label: 'Paid', class: 'badge-soft--blue' },
    };
    const info = statusMap[status] || { label: status, class: 'badge-soft--gray' };
    return (
      <span className={`badge-soft ${info.class}`}>
        {info.label}
      </span>
    );
  };

  const approvalHistoryFallback = useMemo(
    () => (historyModal ? buildFallbackApprovalHistory(historyModal.item) : { history: [], totalSteps: 0 }),
    [historyModal]
  );

  return (
    <div className="crud-page reimbursement-page">
      {/* Header */}
      <PageHeader
        title="Pengelolaan Imbalan"
        subtitle="Tinjau, setujui, dan kelola klaim imbalan di seluruh perusahaan."
        badge={{ icon: Wallet, label: "Pusat Admin" }}
        actions={
          <button className="btn-outline" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        }
      />

      {/* Summary Cards */}
      {stats && (
        <div className="reimb-summary-wrapper">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="reimb-summary-card">
                <div className="reimb-summary-header">
                  <div>
                    <p className="reimb-summary-label">{card.label}</p>
                    <p className="reimb-summary-subtitle">{card.subtitle}</p>
                  </div>
                  <div className={`reimb-summary-icon-wrapper reimb-icon-${card.tone}`}>
                    <Icon size={28} />
                  </div>
                </div>
                <div className={`reimb-summary-value reimb-value-${card.tone}`}>{card.value}</div>
                <p className="reimb-summary-trend">{card.change}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Klaim</h2>
            <p className="analytics-subtitle">Kelola dan tinjau semua klaim imbalan</p>
          </div>
        </div>
      </Card>

      {/* Table Section with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar integrated-table-toolbar--stack-left">
        <div className="control-section-inner">
          {/* Tabs */}
          <div className="elyra-tabs">
            {(["Semua", "Draft", "Submitted", "Approved", "Rejected", "Paid"] as const).map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari klaim..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="search-input-pill"
              />
            </div>
            <button
              className={`filter-btn-rounded ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-dropdown">
            <div className="filter-row">
              {(searchQuery || activeTab !== "Semua") && (
                <button className="btn-clear-filter" onClick={clearFilters}>
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

          {loading && <LoadingState message="Memuat klaim..." />}

          {!loading && paginatedItems.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pencarian Kosong"
                message="Kami tidak menemukan klaim yang sesuai dengan kriteria Anda."
                actionLabel="Bersihkan Filter"
                onAction={clearFilters}
              />
            </div>
          )}

          {!loading && paginatedItems.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '400px' }}>Klaim</th>
                      <th>Kategori</th>
                      <th>Nominal</th>
                      <th>Tanggal</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '180px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {getTitle(item).charAt(0).toUpperCase()}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{getTitle(item)}</span>
                              <span className="cell-stacked__sub">
                                {getEmployeeName(item)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge-soft badge-soft--blue">{getCategoryLabel(item.category)}</span></td>
                        <td><span style={{ color: '#1e293b', fontWeight: 700 }}>{formatCurrency(item.amount)}</span></td>
                        <td>
                          <div className="cell-stacked">
                            <span className="cell-stacked__main" style={{ fontSize: '0.85rem' }}>{formatDateTime(item.expense_date)}</span>
                            <span className="cell-stacked__sub">Tanggal klaim</span>
                          </div>
                        </td>
                        <td className="td-center">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn action-btn-view"
                              onClick={() => handleViewDetail(item)}
                              title="Lihat Detail"
                            >
                              <Eye size={16} />
                            </button>
                            <button className="action-btn" style={{ color: '#8b5cf6', background: '#f5f3ff' }} onClick={() => setHistoryModal({ module: 'reimbursement', id: item.id, item })} title="Riwayat Approval"><History size={16} /></button>
                            {canApprove && item.can_act !== false && item.status === 'submitted' && (
                              <>
                                <button
                                  className="action-btn action-btn-approve"
                                  onClick={() => handleApprove(item)}
                                  title="Setujui"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  className="action-btn action-btn-reject"
                                  onClick={() => handleReject(item)}
                                  title="Tolak"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            {canDelete && (
                            <button
                              className="action-btn action-btn-delete"
                              onClick={() => setDeleteTarget(item)}
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="table-pagination">
                <div className="pagination-info">
                  {sortedItems.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedItems.length)} dari ${sortedItems.length} data`}
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
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
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
            </>
          )}
        </div>
      </div>

      <Modal isOpen={showDetailModal && !!selectedItem} onClose={() => setShowDetailModal(false)} title="Detail Klaim" size="md"
        footer={<button className="btn-outline" onClick={() => setShowDetailModal(false)} style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer' }}>Tutup</button>}
      >
        <div className="modal-body" style={{ padding: 0 }}>
          <div className="detail-row">
            <span className="detail-label">Judul</span>
            <span className="detail-value">{selectedItem ? getTitle(selectedItem) : '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Deskripsi</span>
            <span className="detail-value">{selectedItem?.description || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Kategori</span>
            <span className="detail-value">{selectedItem ? getCategoryLabel(selectedItem.category) : '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Nominal</span>
            <span className="detail-value" style={{ fontWeight: 700, color: '#1e293b' }}>{selectedItem && formatCurrency(selectedItem.amount)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Tanggal</span>
            <span className="detail-value">{formatDateTime(selectedItem?.expense_date)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">{selectedItem && getStatusBadge(selectedItem.status)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Karyawan</span>
            <span className="detail-value">{selectedItem ? getEmployeeName(selectedItem) : '-'}</span>
          </div>
          {selectedItem?.note && (
            <div className="detail-row">
              <span className="detail-label">Catatan</span>
              <span className="detail-value">{selectedItem.note}</span>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={canApprove && showApproveModal && !!selectedItem} onClose={() => setShowApproveModal(false)} title="Setujui Klaim" size="sm"
        footer={canApprove ? <>
          <button className="btn-outline" onClick={() => setShowApproveModal(false)}>Batal</button>
          <button className="btn-primary" onClick={confirmApprove}>
            <CheckCircle size={16} style={{ marginRight: '8px' }} />
            Setujui
          </button>
        </> : undefined}
      >
        <p>Apakah Anda yakin ingin menyetujui klaim <strong>"{selectedItem ? getTitle(selectedItem) : '-'}"</strong>?</p>
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label>Catatan (Opsional)</label>
          <textarea className="form-control" rows={3} value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="Tambahkan catatan..." />
        </div>
      </Modal>

      <Modal isOpen={canApprove && showRejectModal && !!selectedItem} onClose={() => setShowRejectModal(false)} title="Tolak Klaim" size="sm"
        footer={canApprove ? <>
          <button className="btn-outline" onClick={() => setShowRejectModal(false)}>Batal</button>
          <button className="btn-danger" onClick={confirmReject} disabled={!actionNote.trim()}>
            <XCircle size={16} style={{ marginRight: '8px' }} />
            Tolak
          </button>
        </> : undefined}
      >
        <p>Apakah Anda yakin ingin menolak klaim <strong>"{selectedItem ? getTitle(selectedItem) : '-'}"</strong>?</p>
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label>Alasan Penolakan <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea className="form-control" rows={3} value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="Masukkan alasan penolakan..." required />
        </div>
      </Modal>

      {historyModal && (
        <ApprovalHistoryModal
          isOpen={!!historyModal}
          onClose={() => setHistoryModal(null)}
          module={historyModal.module}
          moduleId={historyModal.id}
          fallbackHistory={approvalHistoryFallback.history}
          fallbackTotalSteps={approvalHistoryFallback.totalSteps}
        />
      )}

      <ConfirmDialog
        isOpen={canDelete && !!deleteTarget}
        title="Hapus Klaim Reimbursement"
        message={`Klaim "${deleteTarget ? getTitle(deleteTarget) : "ini"}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminReimbursementsPage;
