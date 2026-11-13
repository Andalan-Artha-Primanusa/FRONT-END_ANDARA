import { useEffect, useState, useMemo } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { LoadingState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  approveReimbursement,
  getAllReimbursements,
  rejectReimbursement,
} from "@/features/reimbursement/api/reimbursement.service";
import type { ReimbursementItem } from "@/features/reimbursement/types/reimbursement.types";
import { BarChart3, Check, CircleCheckBig, CircleX, Clock3, RefreshCw, X, Receipt, DownloadCloud, History } from "lucide-react";
import { showToast } from "@/shared/ui/toast";
import { RejectReasonModal } from "@/shared/components/RejectReasonModal";
import "@/shared/styles/CrudPage.css";
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "-";
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

const getEmployeeName = (item: any) => {
  if (typeof item.employee_name === "string") return item.employee_name;
  if (item.employee?.name) return item.employee.name;
  if (item.employee?.user?.name) return item.employee.user.name;
  if (item.user?.name) return item.user.name;
  return `EMP-${String(item.employee_id).padStart(3, '0')}`;
};

const ReimbursementApprovalPage = () => {
  const user = useAuthStore((state) => state.user);
  const canApprove = RBACUtils.hasPermission(user, PERMISSIONS.REIMBURSEMENT_APPROVE);
  const [items, setItems] = useState<ReimbursementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number | string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | number | null>(null);

  const paginatedItems = items;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const summaryCards = [
    {
      label: "Pending Requests",
      subtitle: "Pengajuan yang menunggu aksi",
      value: String(totalItems),
      change: "Prioritas review hari ini",
      tone: "blue" as const,
      icon: BarChart3,
    },
    {
      label: "Ready to Review",
      subtitle: "Bukti telah dilampirkan",
      value: String(totalItems),
      change: "Tinjau kelengkapan",
      tone: "orange" as const,
      icon: Clock3,
    },
    {
      label: "Approved Today",
      subtitle: "Aksi yang selesai hari ini",
      value: "0",
      change: "Menunggu pencairan finance",
      tone: "green" as const,
      icon: CircleCheckBig,
    },
    {
      label: "Rejected Today",
      subtitle: "Aksi penolakan hari ini",
      value: "0",
      change: "Dikembalikan ke pemohon",
      tone: "red" as const,
      icon: CircleX,
    },
  ];

  const loadPending = async () => {
    setLoading(true);
    try {
      // Ambil data tanpa filter status di URL dulu untuk memastikan kita dapat data mentah, 
      // lalu kita filter secara presisi di frontend agar tidak luput.
      const result = await getAllReimbursements({ page: currentPage, per_page: pageSize });
      const allItems = result.items || [];
      setTotalPages(result.totalPages ?? 1);
      setTotalItems(result.total ?? allItems.length);
      
      const pendingItems = allItems.filter(i => {
        const s = String(i.status).toLowerCase();
        return s === "pending" || s === "submitted";
      });
      
      setItems(pendingItems);
    } catch (error) {
      console.error("Failed to load approval items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string | number) => {
    if (!canApprove) {
      showToast("Anda tidak memiliki izin menyetujui reimbursement.", "error");
      return;
    }
    setActionLoading(String(id));
    try {
      await approveReimbursement(String(id), { note: "Approved by manager" });
      await loadPending();
      showToast("Pengajuan disetujui", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menyetujui pengajuan", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string | number) => {
    if (!canApprove) {
      showToast("Anda tidak memiliki izin menolak reimbursement.", "error");
      return;
    }
    setRejectTarget(id);
  };

  const confirmReject = async (reason: string) => {
    if (rejectTarget === null) return;
    if (!canApprove) {
      showToast("Anda tidak memiliki izin menolak reimbursement.", "error");
      return;
    }
    setActionLoading(String(rejectTarget));
    try {
      await rejectReimbursement(String(rejectTarget), { note: reason || "Ditolak tanpa alasan" });
      await loadPending();
      showToast("Pengajuan ditolak", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menolak pengajuan", "error");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    void loadPending();
  }, [currentPage, pageSize]);

  return (
    <div className="crud-page">
      <PageHeader
        title="Reimbursement Approval"
        subtitle="Review and approve/reject pending employee expense reimbursements securely."
        badge={{ icon: Receipt, label: "Reimburse Center" }}
        scope
        actions={
          <Button variant="outline" size="md" onClick={() => void loadPending()} disabled={loading} style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>
            <RefreshCw size={16} />
            {loading ? "Memuat..." : "Segarkan"}
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="summary-card" glass>
              <div className="summary-card__header">
                <div>
                  <span className="summary-card__label">{card.label}</span>
                  <p className="summary-card__subtitle">{card.subtitle}</p>
                </div>
                <span className={`summary-card__icon summary-card__icon--${card.tone}`}>
                  <Icon size={20} />
                </span>
              </div>
              <div className={`summary-card__value summary-card__value--${card.tone}`}>{card.value}</div>
              <div className="summary-card__change">{card.change}</div>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card className="table-card" glass>
        <div className="table-header-bar">
          <h3>Pending Reimbursement Requests</h3>
          <span className="table-count">{totalItems} pengajuan</span>
        </div>

        {loading && <div className="table-card-inner"><LoadingState message="Memuat data pengajuan reimbursement..." /></div>}
        {!loading && items.length === 0 && (
          <div className="table-card-inner">
            <EmptyState
              icon=""
              title="Tidak ada pengajuan"
              message="Semua pengajuan reimbursement telah diproses."
            />
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="table-card-inner">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>EMPLOYEE</th>
                    <th>KATEGORI PENGELUARAN</th>
                    <th>TANGGAL & NOMINAL</th>
                    <th>BUKTI / LAMPIRAN</th>
                    <th>KETERANGAN</th>
                    <th className="th-center">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, index) => {
                    return (
                      <tr key={String(item.id ?? index)}>
                        <td>
                          <div className="cell-id">{index + 1}</div>
                          <div className="cell-sub">ID: {item.id}</div>
                        </td>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {getEmployeeName(item).charAt(0).toUpperCase()}
                            </div>
                            <span className="cell-name-text">{getEmployeeName(item)}</span>
                          </div>
                        </td>
                        <td>
                          <span className="cell-tag">{String(item.category).replace('_', ' ')}</span>
                          <div className="cell-date-sub" style={{ marginTop: '4px', fontWeight: 600 }}>{String(item.title)}</div>
                        </td>
                        <td>
                          <div className="cell-date">{formatDate(String(item.expense_date))}</div>
                          <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>Rp {Number(item.amount).toLocaleString('id-ID')}</div>
                        </td>
                        <td>
                           {item.receipt_path ? (
                             <a href={String(item.receipt_path)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '0.8rem', textDecoration: 'none', background: '#eff6ff', padding: '4px 8px', borderRadius: '4px' }}>
                               <DownloadCloud size={14} /> Lihat Bukti
                             </a>
                           ) : (
                             <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Receipt size={14}/> Tidak ada</span>
                           )}
                        </td>
                        <td title={String(item.description || "-")}>
                          <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                            {String(item.description || "Tidak disediakan")}
                          </div>
                        </td>
                        <td>
                          <div className="action-btn-group">
                            {canApprove && item.can_act !== false && (
                              <>
                                <button
                                  className="action-btn action-btn-success"
                                  onClick={() => void handleApprove(item.id)}
                                  disabled={actionLoading === String(item.id)}
                                  title="Approve Reimburse"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  className="action-btn action-btn-delete"
                                  onClick={() => void handleReject(item.id)}
                                  disabled={actionLoading === String(item.id)}
                                  title="Reject Reimburse"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                            <button className="action-btn" style={{ color: '#8b5cf6', background: '#f5f3ff' }} onClick={() => setHistoryModal({ module: 'reimbursement', id: item.id })} title="Riwayat Approval"><History size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="table-pagination">
            <div className="pagination-info">
              {totalItems === 0
                ? 'Menampilkan 0 data'
                : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalItems)} dari ${totalItems} data`}
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

      {historyModal && (
        <ApprovalHistoryModal
          isOpen={!!historyModal}
          onClose={() => setHistoryModal(null)}
          module={historyModal.module}
          moduleId={historyModal.id}
        />
      )}

      <RejectReasonModal
        isOpen={canApprove && rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={confirmReject}
        title="Alasan Penolakan"
        confirmLabel="Tolak"
      />
    </div>
  );
};

export default ReimbursementApprovalPage;
