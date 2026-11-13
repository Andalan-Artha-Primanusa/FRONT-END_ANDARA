import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import {
  deleteKpi,
  getAllKpis,
  approveKpi,
} from '@/features/dashboard/api/kpi.service';
import { Target, Users, RefreshCw, Trash2, Edit, Check, FileText, Send, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/shared/ui';
import { showToast } from '@/shared/ui/toast';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import '@/shared/styles/CrudPage.css';

type KpiStatus = 'draft' | 'submitted' | 'approved';

type KpiRecord = {
  id?: number | string;
  employee_id?: number | string;
  title?: string;
  description?: string;
  target?: number | string;
  achievement?: number | string;
  period?: string;
  score?: number | string;
  status?: KpiStatus | string;
  created_at?: string;
  updated_at?: string;
  employee?: { id?: number | string; name?: string };
  user?: { id?: number | string; name?: string };
  [key: string]: unknown;
};

const KpiListPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canCreate = RBACUtils.hasPermission(user, PERMISSIONS.KPI_CREATE);
  const canUpdate = RBACUtils.hasPermission(user, PERMISSIONS.KPI_UPDATE);
  const canDelete = RBACUtils.hasPermission(user, PERMISSIONS.KPI_DELETE);
  const canApprove = RBACUtils.hasPermission(user, PERMISSIONS.KPI_APPROVE);
  const [items, setItems] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [allItemsRaw, setAllItemsRaw] = useState<KpiRecord[]>([]);

  const summaryCards = useMemo(() => {
    const source = allItemsRaw.length > 0 ? allItemsRaw : items;
    const totalKpi = source.length;
    const approvedCount = source.filter(i => String(i.status).toLowerCase() === 'approved').length;
    const submittedCount = source.filter(i => String(i.status).toLowerCase() === 'submitted').length;
    const _draftCount = source.filter(i => String(i.status).toLowerCase() === 'draft').length;
    const avgScore = totalKpi > 0 
      ? source.reduce((sum, i) => sum + (Number(i.score) || 0), 0) / totalKpi 
      : 0;
    return [
      {
        label: "Total KPIs",
        subtitle: "Semua target kinerja",
        value: String(totalKpi),
        change: "Keseluruhan",
        tone: "blue" as const,
        icon: Target,
      },
      {
        label: "Submitted",
        subtitle: "Menunggu approval",
        value: String(submittedCount),
        change: "Belum diapprove",
        tone: "orange" as const,
        icon: Send,
      },
      {
        label: "Approved",
        subtitle: "Sudah disetujui",
        value: String(approvedCount),
        change: "Selesai review",
        tone: "green" as const,
        icon: CheckCircle2,
      },
      {
        label: "Avg Score",
        subtitle: "Rata-rata pencapaian",
        value: avgScore > 0 ? `${avgScore.toFixed(1)}%` : "-",
        change: "Performance indicator",
        tone: "purple" as const,
        icon: Users,
      },
    ];
  }, [items, allItemsRaw]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getAllKpis();
      const raw = (result.items || []) as KpiRecord[];
      setAllItemsRaw(raw);
      
      if (!filterStatus) {
        setItems(raw);
      } else {
        const filtered = raw.filter(i => {
          const s = String(i.status).toLowerCase();
          const f = filterStatus.toLowerCase();
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

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      showToast("Anda tidak memiliki izin menghapus KPI.", "error");
      return;
    }
    setActionLoading(id + '_del');
    try {
      await deleteKpi(id);
      await loadData();
      showToast("Data dihapus", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menghapus", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (id: string) => {
    if (!canApprove) {
      showToast("Anda tidak memiliki izin menyetujui KPI.", "error");
      return;
    }
    await handleAction(id + '_app', () => approveKpi(id), "KPI berhasil diapprove");
  };

  const handleSubmitKpi = async (id: string) => {
    await handleAction(id + '_sub', async () => { console.log('submit', id); }, "KPI berhasil disubmit untuk review");
  };

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const getEmployeeName = (item: any) => {
    if (item.employee?.name) return item.employee.name;
    if (item.user?.name) return item.user.name;
    if (item.employee_name) return item.employee_name;
    return `EMP-${String(item.employee_id).padStart(3, '0')}`;
  };

  const getStatusChipClass = (statusValue: unknown) => {
    const status = String(statusValue ?? '').toLowerCase();
    if (status === 'approved') return 'cell-status cell-status--success';
    if (status === 'submitted') return 'cell-status cell-status--warning';
    return 'cell-status cell-status--neutral';
  };

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        badge={{ icon: Target, label: 'KPI Management' }}
        title="Key Performance Indicators"
        subtitle="Kelola target dan pencapaian KPI karyawan."
        actions={
          <div className="page-hero-actions">
            <Button variant="outline" size="md" onClick={() => void loadData()} disabled={loading} style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>
              <RefreshCw size={16} />
              {loading ? "Memuat..." : "Segarkan"}
            </Button>
            {canCreate && (
            <Button variant="primary" size="md" onClick={() => navigate('/kpis/add')}>
              Buat KPI Baru
            </Button>
            )}
          </div>
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
          <h3>Master KPI List</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '0.85rem' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
            </select>
            <span className="table-count">{items.length} records</span>
          </div>
        </div>

        {loading && <div className="table-card-inner"><LoadingState message="Memuat database KPI..." /></div>}
        {!loading && items.length === 0 && (
          <div className="table-card-inner">
            <EmptyState
              icon=""
              title="Tidak ada data"
              message="Belum ada target KPI yang tercatat."
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
                    <th>PERIODE</th>
                    <th>TARGET KPI</th>
                    <th>ACHIEVEMENT</th>
                    <th>SCORE</th>
                    <th>STATUS</th>
                    <th className="th-center">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
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
                          <span className="cell-tag">{String(item.period)}</span>
                        </td>
                        <td>
                          <div className="cell-date">{String(item.title)}</div>
                          <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>Target: {Number(item.target).toLocaleString('id-ID')}</div>
                        </td>
                        <td>
                           <span style={{ fontWeight: 600 }}>{item.achievement ? Number(item.achievement).toLocaleString('id-ID') : '-'}</span>
                        </td>
                        <td>
                           <span style={{ 
                             fontWeight: 700, 
                             color: Number(item.score) >= 100 ? '#10b981' : Number(item.score) >= 70 ? '#f59e0b' : '#ef4444' 
                           }}>
                             {item.score ? `${item.score}%` : '-'}
                           </span>
                        </td>
                        <td>
                           <span className={getStatusChipClass(item.status)}>
                             {String(item.status).toUpperCase()}
                           </span>
                        </td>
                        <td>
                            <div className="action-btn-group">
                              {item.status === 'draft' && (
                                <button
                                  className="action-btn action-btn-success"
                                  onClick={() => void handleSubmitKpi(String(item.id))}
                                  disabled={actionLoading === String(item.id)+'_sub'}
                                  title="Submit for Review"
                                >
                                  <FileText size={16} />
                                </button>
                              )}
                              {canApprove && item.status === 'submitted' && (
                                <button
                                  className="action-btn action-btn-success"
                                  onClick={() => void handleApprove(String(item.id))}
                                  disabled={actionLoading === String(item.id)+'_app'}
                                  title="Approve"
                                >
                                  <Check size={16} />
                                </button>
                              )}
                              {canUpdate && (
                              <button
                                  className="action-btn action-btn-edit"
                                  onClick={() => navigate(`/kpis/edit/${item.id}`)}
                                  title="Edit KPI"
                              >
                                <Edit size={16} />
                             </button>
                              )}
                             {canDelete && (
                             <button
                                  className="action-btn action-btn-delete"
                                  onClick={() => void handleDelete(String(item.id))}
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
      </Card>
    </div>
  );
};

export default KpiListPage;
