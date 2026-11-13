import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, Wallet, Search, Eye, Pencil, Trash2, Send, CheckCircle2, Clock, TrendingUp, History } from 'lucide-react';
import { Card, ConfirmDialog, PageHeader } from '@/shared/ui';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { ReimbursementDetailModal } from '@/features/reimbursement/components/ReimbursementDetailModal';
import { ReimbursementModal } from '@/features/reimbursement/components/ReimbursementModal';
import {
  getMyReimbursements,
  createMyReimbursement,
  updateMyReimbursement,
  deleteMyReimbursement,
  submitMyReimbursement
} from '../../features/reimbursement/api/reimbursement.service';
import type { ReimbursementItem } from '../../features/reimbursement/types/reimbursement.types';
import { showToast } from '@/shared/ui/toast';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/features/reimbursement/Reimbursement.css';
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";
import type { HistoryItem } from "@/shared/components/ApprovalHistoryModal";

const getStatusClass = (status?: string) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved" || normalized === "paid") return "status-badge status-badge--approved";
  if (normalized === "submitted") return "status-badge status-badge--pending";
  if (normalized === "rejected") return "status-badge status-badge--draft";
  return "status-badge status-badge--draft";
};

const formatCurrency = (amount: number) => `Rp ${(amount || 0).toLocaleString("id-ID")}`;

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
};

const getActionErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message || error?.message;
  return message === "Forbidden" ? fallback : message || fallback;
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
          acted_at: action === "pending" ? "" : item.approved_at || item.updated_at || item.submitted_at || "",
          role: { display_name: "Approver", name: "approver" },
          user: item.approver,
        },
      ],
    };
  }

  return { history: [], totalSteps: 0 };
};

const MyReimbursementsPage: React.FC = () => {
  const [items, setItems] = useState<ReimbursementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReimbursementItem | null>(null);
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number | string; item: ReimbursementItem } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReimbursementItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Search & Filter
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"Semua" | "Draft" | "Submitted" | "Approved" | "Rejected" | "Paid">("Semua");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const reimbData = await getMyReimbursements('', currentPage, pageSize);
      setItems(reimbData.items);
        setTotalPages(reimbData.totalPages);
    } catch (error) {
      console.error('Failed to fetch reimbursements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const title = String(item?.title || '').toLowerCase();
      const desc = String(item?.description || '').toLowerCase();
      const query = searchText.toLowerCase();
      const matchSearch = title.includes(query) || desc.includes(query);

      let statusMatch = true;
      if (activeTab === "Draft") statusMatch = item.status === "draft";
      else if (activeTab === "Submitted") statusMatch = item.status === "submitted";
      else if (activeTab === "Approved") statusMatch = item.status === "approved";
      else if (activeTab === "Rejected") statusMatch = item.status === "rejected";
      else if (activeTab === "Paid") statusMatch = item.status === "paid";

      return matchSearch && statusMatch;
    });
  }, [items, searchText, activeTab]);

  const paginatedItems = filteredItems;

  const [totalPages, setTotalPages] = useState(1);

  const summaryStats = useMemo(() => {
    const total = items.length;
    const approved = items.filter(i => i.status === 'approved' || i.status === 'paid').length;
    const pending = items.filter(i => i.status === 'submitted').length;
    const totalAmount = items.reduce((acc, i) => acc + (i.amount || 0), 0);

    return [
      { label: "Total Klaim", subtitle: "Seluruh klaim", value: total, tone: "blue" as const },
      { label: "Disetujui", subtitle: "Klaim disetujui", value: approved, tone: "green" as const },
      { label: "Menunggu", subtitle: "Klaim diajukan", value: pending, tone: "orange" as const },
      { label: "Total Nilai", subtitle: "Nilai seluruh klaim", value: formatCurrency(totalAmount), tone: "purple" as const },
    ];
  }, [items]);

  const approvalHistoryFallback = useMemo(
    () => (historyModal ? buildFallbackApprovalHistory(historyModal.item) : { history: [], totalSteps: 0 }),
    [historyModal]
  );

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ReimbursementItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (item: ReimbursementItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      const payload = {
        title: String(data.title || "").trim(),
        description: String(data.description || "").trim(),
        amount: Number(data.amount),
        category: String(data.category || "other"),
        expense_date: String(data.expense_date || ""),
        receipt_path: String(data.receipt_path || "").trim(),
      };

      if (!payload.title || !payload.amount || !payload.category || !payload.expense_date) {
        showToast("Judul, jumlah, kategori, dan tanggal pengeluaran wajib diisi.", "error");
        return;
      }

      if (selectedItem) {
        await updateMyReimbursement(String(selectedItem.id), payload);
        showToast("Klaim penggantian berhasil diperbarui.", "success");
      } else {
        await createMyReimbursement(payload);
        showToast("Klaim penggantian berhasil dibuat sebagai konsep.", "success");
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Failed to save reimbursement:', error);
      showToast(getActionErrorMessage(error, "Gagal menyimpan klaim penggantian."), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteMyReimbursement(String(deleteTarget.id));
      await fetchData();
      showToast("Klaim penggantian berhasil dihapus.", "success");
      setDeleteTarget(null);
    } catch (error: any) {
      console.error('Failed to delete reimbursement:', error);
      showToast(getActionErrorMessage(error, "Gagal menghapus klaim penggantian."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (item: ReimbursementItem) => {
    try {
      await submitMyReimbursement(String(item.id));
      await fetchData();
      showToast("Klaim penggantian berhasil diajukan.", "success");
    } catch (error: any) {
      console.error('Failed to submit reimbursement:', error);
      showToast(getActionErrorMessage(error, "Gagal mengajukan klaim penggantian."), "error");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _clearFilters = () => {
    setSearchText("");
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title="Imbalan Saya"
        subtitle="Lacak dan kelola klaim pengeluaran Anda."
        badge={{ icon: Wallet, label: "Layanan Mandiri" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              Klaim Baru
            </button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryStats.map((card) => {
          const Icon = card.tone === "blue" ? Wallet : card.tone === "green" ? CheckCircle2 : card.tone === "orange" ? Clock : TrendingUp;

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
            <Wallet size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Klaim</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua klaim pengeluaran Anda</p>
          </div>
        </div>
      </Card>

      {/* Table Section with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          {/* Tabs */}
          <div className="elyra-tabs">
            {(["Semua", "Draft", "Submitted", "Approved", "Rejected", "Paid"] as const).map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari klaim..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
          </div>
        </div>
      </Card>

          {loading && <LoadingState message="Memuat klaim..." />}

          {!loading && paginatedItems.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Belum Ada Klaim"
                message={searchText || activeTab !== "Semua"
                  ? "Tidak ada klaim yang sesuai dengan kriteria Anda."
                  : "Anda belum memiliki klaim pengeluaran. Buat klaim pertama untuk memulai."}
                actionLabel="Buat Klaim Baru"
                onAction={handleOpenCreate}
              />
            </div>
          )}

          {!loading && paginatedItems.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '300px' }}>Judul Klaim</th>
                      <th>Tanggal</th>
                      <th>Nilai</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '140px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {item.title ? item.title.charAt(0).toUpperCase() : "K"}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{item.title}</span>
                              <span className="cell-stacked__sub">{item.description ? item.description.substring(0, 30) + "..." : "Tidak ada deskripsi"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stacked">
                            <span className="cell-stacked__main" style={{ fontSize: '0.85rem' }}>{formatDate(item.expense_date)}</span>
                            <span className="cell-stacked__sub">Tanggal Pengeluaran</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: '#475569', fontWeight: 600 }}>{formatCurrency(item.amount)}</span>
                        </td>
                        <td className="td-center">
                          <span className={getStatusClass(item.status)}>
                            {item.status === "approved" ? "Approved" :
                              item.status === "submitted" ? "Submitted" :
                                item.status === "rejected" ? "Rejected" :
                                  item.status === "paid" ? "Paid" : "Draft"}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => handleOpenDetail(item)}
                              title="Lihat Detail"
                            >
                              <Eye size={16} />
                            </button>
                            {item.status === 'draft' && (
                              <>
                                <button
                                  className="action-btn action-btn-edit"
                                  onClick={() => handleOpenEdit(item)}
                                  title="Edit"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  className="action-btn"
                                  style={{ color: '#8b5cf6' }}
                                  onClick={() => handleSubmit(item)}
                                  title="Ajukan"
                                >
                                  <Send size={16} />
                                </button>
                              </>
                            )}
                            {item.status === 'draft' && (
                              <button
                                className="action-btn action-btn-delete"
                                onClick={() => setDeleteTarget(item)}
                                title="Hapus"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <button className="action-btn" style={{ color: '#8b5cf6', background: '#f5f3ff' }} onClick={() => setHistoryModal({ module: 'reimbursement', id: item.id, item })} title="Riwayat Approval"><History size={16} /></button>
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
                  {filteredItems.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredItems.length)} dari ${filteredItems.length} data`}
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

      <ReimbursementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={selectedItem}
      />

      <ReimbursementDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        item={selectedItem}
      />

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
        isOpen={!!deleteTarget}
        title="Hapus Klaim Reimbursement"
        message={`Klaim "${String(deleteTarget?.title || "ini")}" akan dihapus dari daftar draft Anda. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default MyReimbursementsPage;
