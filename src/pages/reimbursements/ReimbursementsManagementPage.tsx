import { useEffect, useState, useMemo } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { PageHeader } from "@/shared/ui/PageHeader";
import { LoadingState, EmptyState } from "@/shared/ui/DataStateDisplay";
import {
  approveReimbursement,
  rejectReimbursement,
  createReimbursement,
  deleteReimbursement,
  getAllReimbursements,
  getLegacyBenefitEntitlements,
  markReimbursementAsPaid,
  updateReimbursement,
} from "@/features/reimbursement/api/reimbursement.service";
import type { ReimbursementItem, ReimbursementCreatePayload, ReimbursementUpdatePayload } from "@/features/reimbursement/types/reimbursement.types";
import { BarChart3, Clock3, CircleCheckBig, RefreshCw, DollarSign, Trash2, Edit, Receipt, DownloadCloud, Check, X } from "lucide-react";
import { showToast } from "@/shared/ui/toast";
import { RejectReasonModal } from "@/shared/components/RejectReasonModal";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import { isLegacyPresentationSession } from "@/shared/config/legacyPresentation";
import "@/shared/styles/CrudPage.css";

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

const getEmployeeInfo = (item: any) => {
  const emp = item.employee;
  const user = emp?.user || item.user;
  const name = user?.name || emp?.full_name || item.employee_name || `EMP-${item.employee_id}`;
  const deptName = emp?.department?.name || "-";
  const posName = emp?.position?.name || "Karyawan";
  
  return { name, deptName, posName };
};

const DEFAULT_FORM = {
  id: "",
  employee_id: "",
  title: "",
  description: "",
  amount: "",
  category: "travel",
  expense_date: new Date().toISOString().split('T')[0],
  receipt_path: "",
};

const ReimbursementsManagementPage = () => {
  const user = useAuthStore((state) => state.user);
  const canApprove = RBACUtils.hasPermission(user, PERMISSIONS.REIMBURSEMENT_APPROVE);
  const canPay = RBACUtils.hasPermission(user, PERMISSIONS.REIMBURSEMENT_PAY);
  const canCreate = RBACUtils.hasPermission(user, "reimbursement.create");
  const canDelete = RBACUtils.hasPermission(user, "reimbursement.delete");
  const [items, setItems] = useState<ReimbursementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ReimbursementItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; actionId: string } | null>(null);

  const [allItemsRaw, setAllItemsRaw] = useState<ReimbursementItem[]>([]);
  const [legacyEntitlements, setLegacyEntitlements] = useState<Array<{ amount_balance?: number }>>([]);
  const legacyReadOnly = isLegacyPresentationSession();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const summaryCards = useMemo(() => {
    // Gunakan allItemsRaw agar statistik di atas tidak ikut jadi 0 saat difilter
    const source = allItemsRaw.length > 0 ? allItemsRaw : items;
    // Total Expense Volume hanya menghitung yang sudah APPROVED atau PAID (bukan Rejected/Draft)
    const totalAmount = source.reduce((sum, item) => {
      const s = String(item.status).toLowerCase();
      if (s === 'rejected' || s === 'draft') return sum;
      return sum + (Number(item.amount) || 0);
    }, 0);
    const paidCount = source.filter(i => String(i.status).toLowerCase() === "paid").length;
    return [
      {
        label: "Total Registrations",
        subtitle: "Semua pengajuan yang masuk",
        value: String(source.length),
        change: "Total Ledger",
        tone: "blue" as const,
        icon: BarChart3,
      },
      {
        label: "Unpaid / Pending",
        subtitle: "Belum dibayarkan tunai",
        value: String(source.filter(i => {
           const s = String(i.status).toLowerCase();
           return s === 'pending' || s === 'submitted' || s === 'approved';
        }).length),
        change: "Hutang perusahaan",
        tone: "orange" as const,
        icon: Clock3,
      },
      {
        label: "Paid Successfully",
        subtitle: "Pembayaran telah diselesaikan",
        value: String(paidCount),
        change: "Telah ditransfer finance",
        tone: "green" as const,
        icon: CircleCheckBig,
      },
      {
        label: "Total Expense Volume",
        subtitle: "Total pengeluaran tercatat",
        value: `Rp ${totalAmount.toLocaleString("id-ID")}`,
        change: "Keseluruhan biaya expense",
        tone: "purple" as const,
        icon: Receipt,
      },
      ...(legacyReadOnly ? [{
        label: "Benefit Entitlements",
        subtitle: "Saldo benefit legacy MINEPRO",
        value: String(legacyEntitlements.length),
        change: "Aturan benefit terhubung",
        tone: "blue" as const,
        icon: DollarSign,
      }] : []),
    ];
  }, [items, allItemsRaw, legacyEntitlements.length, legacyReadOnly]);

  const paginatedItems = items;
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getAllReimbursements({ page: currentPage, per_page: pageSize });
      const raw = result.items || [];
      setTotalPages(result.totalPages ?? 1);
      setAllItemsRaw(raw);
      if (legacyReadOnly) {
        const entitlements = await getLegacyBenefitEntitlements();
        setLegacyEntitlements(entitlements.items as Array<{ amount_balance?: number }>);
      }
      
      if (!filterStatus) {
        setItems(raw);
      } else {
        const filtered = raw.filter(i => {
          const s = String(i.status).toLowerCase();
          const f = filterStatus.toLowerCase();
          // Jika filter 'pending', sertakan juga 'submitted'
          if (f === "pending") return s === "pending" || s === "submitted";
          return s === f;
        });
        setItems(filtered);
      }
    } catch (error: any) {
      showToast(error.message || "Gagal memuat data dari server.", "error");
    } finally {
      setLoading(false);
    }
  };


  const handleCreateOrUpdate = async () => {
    if (!form.employee_id || !form.title || !form.amount) return;
    setActionLoading("form");
    try {
      if (form.id) {
        const payload: ReimbursementUpdatePayload = {
          title: form.title,
          description: form.description,
          amount: Number(form.amount),
          category: form.category,
          expense_date: form.expense_date,
          receipt_path: form.receipt_path,
        };
        await updateReimbursement(form.id, payload);
      } else {
        const payload: ReimbursementCreatePayload = {
          employee_id: Number(form.employee_id),
          title: form.title,
          description: form.description,
          amount: Number(form.amount),
          category: form.category,
          expense_date: form.expense_date,
          receipt_path: form.receipt_path,
        };
        await createReimbursement(payload);
      }
      setIsFormOpen(false);
      setForm(DEFAULT_FORM);
      await loadData();
      showToast("Data berhasil disimpan", "success");
    } catch (error: any) {
      showToast(error.message || "Simpan data gagal", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (actionId: string, actionFn: () => Promise<any>, successMsg: string) => {
    setActionLoading(actionId);
    try {
      await actionFn();
      await loadData();
      showToast(successMsg, "success");
    } catch (error: any) {
      showToast(error.message || "Aksi gagal", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = String(deleteTarget.id);
    setActionLoading(id + '_del');
    try {
      await deleteReimbursement(id);
      await loadData();
      showToast("Data dihapus", "success");
      setDeleteTarget(null);
    } catch (error: any) {
      showToast(error.message || "Gagal menghapus", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (item: ReimbursementItem) => {
    setForm({
      id: String(item.id),
      employee_id: String(item.employee_id),
      title: String(item.title),
      description: String(item.description || ""),
      amount: String(item.amount),
      category: String(item.category),
      expense_date: String(item.expense_date),
      receipt_path: String(item.receipt_path || ""),
    });
    setIsFormOpen(true);
  };

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  return (
    <div className="crud-page">
      <PageHeader
        title="Reimbursement Ledger"
        subtitle="Master list of all company expense reimbursements for Finance processing."
        badge={{ icon: Receipt, label: "Reimburse Finance" }}
        scope
        actions={
          <>
            <Button variant="outline" size="md" onClick={() => void loadData()} disabled={loading} style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>
              <RefreshCw size={16} />
              {loading ? "Memuat..." : "Segarkan"}
            </Button>
            {canCreate && (
            <Button variant="primary" size="md" onClick={() => { setForm(DEFAULT_FORM); setIsFormOpen(!isFormOpen); }}>
              Buat Data Baru
            </Button>
            )}
          </>
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

      {/* Form Overlay */}
      {isFormOpen && (
        <Card className="table-card" glass style={{ marginBottom: "1.5rem" }}>
           <div className="table-header-bar">
             <h3>{form.id ? "Ubah Ledger Entry" : "Buat Ledger Entry Baru"}</h3>
           </div>
           <div className="table-card-inner">
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>ID Karyawan</label>
                  <input style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} value={form.employee_id} onChange={(e) => setForm(f => ({...f, employee_id: e.target.value}))} placeholder="Misal: 1" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Kategori</label>
                  <select className="ui-input" style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }} value={form.category} onChange={(e) => setForm(f => ({...f, category: e.target.value}))}>
                    <option value="travel">Travel</option>
                    <option value="medical">Medical</option>
                    <option value="office_supplies">Office Supplies</option>
                    <option value="training">Training</option>
                    <option value="meal">Meal</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="transportation">Transportation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Judul Pengeluaran</label>
                  <input style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} value={form.title} onChange={(e) => setForm(f => ({...f, title: e.target.value}))} placeholder="Tiket Pesawat Jakarta-Bali" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Nominal (Rp)</label>
                  <input style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} type="text" inputMode="numeric" value={form.amount ? Number(form.amount).toLocaleString("id-ID") : ""} onChange={(e) => setForm(f => ({...f, amount: e.target.value.replace(/\D/g, "")}))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Tanggal Transaksi</label>
                  <input style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} type="date" value={form.expense_date} onChange={(e) => setForm(f => ({...f, expense_date: e.target.value}))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Path Bukti Lampiran</label>
                  <input style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} value={form.receipt_path} onChange={(e) => setForm(f => ({...f, receipt_path: e.target.value}))} placeholder="/assets/receipts/005.jpg" />
                </div>
             </div>
             <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.75rem' }}>
                 <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Batal</Button>
                 {canCreate && (
                 <Button variant="primary" onClick={() => void handleCreateOrUpdate()} disabled={actionLoading === "form"}>Simpan Data Ledger</Button>
                 )}
              </div>
           </div>
        </Card>
      )}

      {/* Table */}
      <Card className="table-card" glass>
        <div className="table-header-bar">
          <h3>Master Reimbursement Ledger</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '0.85rem' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="draft">Selesai Draft</option>
              <option value="pending">Menunggu (Pending)</option>
              <option value="approved">Disetujui (Approved)</option>
              <option value="paid">Dibayarkan (Paid)</option>
              <option value="rejected">Ditolak (Rejected)</option>
            </select>
            <span className="table-count">{items.length} records</span>
          </div>
        </div>

        {loading && <div className="table-card-inner"><LoadingState message="Memuat database ledger..." /></div>}
        {!loading && items.length === 0 && (
          <div className="table-card-inner">
            <EmptyState
              icon=""
              title="Tidak ada data"
              message="Belum ada catatan biaya operasional/reimburse."
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
                    <th>KATEGORI</th>
                    <th>DETAIL ALOKASI DANA</th>
                    <th>LAMPIRAN</th>
                    <th>STATUS PEMBAYARAN</th>
                    <th className="th-center">AKSI FINANCE</th>
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
                              {(() => {
                                const info = getEmployeeInfo(item);
                                return info.name.charAt(0).toUpperCase();
                              })()}
                            </div>
                            <div className="cell-stacked">
                              {(() => {
                                const info = getEmployeeInfo(item);
                                return (
                                  <>
                                    <span className="cell-name-text">{info.name}</span>
                                    <span className="cell-stacked__sub">{info.deptName} • {info.posName}</span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="cell-tag">{String(item.category).replace('_', ' ')}</span>
                        </td>
                        <td>
                          <div className="cell-date">{String(item.title)}</div>
                          <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>Rp {Number(item.amount).toLocaleString('id-ID')} ({formatDate(String(item.expense_date))})</div>
                        </td>
                        <td>
                           {item.receipt_path ? (
                             <a href={String(item.receipt_path)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '0.8rem', textDecoration: 'none' }}>
                               <DownloadCloud size={14} /> Tinjau
                             </a>
                           ) : (
                             <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Receipt size={14}/> -</span>
                           )}
                        </td>
                        <td>
                           {item.status === 'approved' ? (
                             <>
                               <span style={{ color: '#10b981', background: '#ecfdf5', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'inline-block', marginBottom: '4px' }}>APPROVED</span>
                               <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Menunggu transfer</div>
                             </>
                           ) : item.status === 'rejected' ? <span style={{ color: '#ef4444', background: '#fef2f2', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>REJECTED</span> :
                            item.status === 'paid' ? <span style={{ color: 'var(--color-primary)', background: '#eff6ff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>LUNAS / PAID</span> :
                            (item.status === 'pending' || item.status === 'submitted') ? <span style={{ color: '#f59e0b', background: '#fffbeb', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>PENDING</span> :
                             <span style={{ color: '#64748b', background: '#f8fafc', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>DRAFT</span>}
                        </td>
<td>
                            <div className="action-btn-group">
                              {canApprove && (item.status === 'pending' || item.status === 'submitted') && item.can_act !== false && (
                                <>
                                  <button
                                    className="action-btn action-btn-success"
                                    onClick={() => void handleAction(String(item.id)+'_app', () => approveReimbursement(String(item.id), { note: "Approved from Ledger" }), "Berhasil disetujui")}
                                    disabled={actionLoading === String(item.id)+'_app'}
                                    title="Approve"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                     className="action-btn action-btn-delete"
                                     onClick={() => setRejectTarget({ id: String(item.id), actionId: String(item.id)+'_rej' })}
                                     disabled={actionLoading === String(item.id)+'_rej'}
                                     title="Reject"
                                   >
                                    <X size={16} />
                                  </button>
                                </>
                              )}
                              {canPay && item.status === 'approved' && (
                                <button
                                  className="action-btn action-btn-edit"
                                  onClick={() => void handleAction(String(item.id)+'_paid', () => markReimbursementAsPaid(String(item.id)), "Status diubah menjadi PAID")}
                                  disabled={actionLoading === String(item.id)+'_paid'}
                                  title="Tandai Sudah Ditransfer (Mark Paid)"
                                >
                                  <DollarSign size={16} />
                                </button>
                              )}
                              {canCreate && (
                              <button
                                  className="action-btn action-btn-edit"
                                  onClick={() => handleEdit(item)}
                                  title="Edit Ledger"
                              >
                                <Edit size={16} />
                             </button>
                              )}
                             {canDelete && (
                             <button
                                  className="action-btn action-btn-delete"
                                  onClick={() => setDeleteTarget(item)}
                                  disabled={actionLoading === String(item.id)+'_del'}
                                  title="Hapus Permanen"
                              >
                                 <Trash2 size={16} />
                             </button>
                             )}
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

      <ConfirmDialog
        isOpen={canDelete && !!deleteTarget}
        title="Hapus Ledger Reimbursement"
        message={`Ledger "${String(deleteTarget?.title || "ini")}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={!!deleteTarget && actionLoading === String(deleteTarget.id) + '_del'}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <RejectReasonModal
        isOpen={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={async (reason: string) => {
          const target = rejectTarget;
          if (!target) return;
          setRejectTarget(null);
          await handleAction(target.actionId, () => rejectReimbursement(target.id, { note: reason || "Ditolak oleh Admin" }), "Pengajuan ditolak");
        }}
        title="Alasan Penolakan"
        confirmLabel="Tolak"
      />
    </div>
  );
};

export default ReimbursementsManagementPage;
