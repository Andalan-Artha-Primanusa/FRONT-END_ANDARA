import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  ShieldCheck,
  Clock,
  Pencil,
  Trash2,
  RefreshCw,
  CalendarDays,
  Search,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import { LoadingState, ErrorState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { api } from '@/shared/api/httpClient';
import { showToast } from '@/shared/ui/toast';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './AdminLeavePages.css';

interface LeavePolicy {
  id: number;
  name: string;
  policy_code: string;
  entitlement_type: string;
  entitlement_value: number;
  max_carryover_days: number;
  is_paid: boolean;
  active: boolean;
  year?: number;
}

const LeavePolicyPage = () => {
  const user = useAuthStore((state) => state.user);
  const canAccess = RBACUtils.hasPermission(user, PERMISSIONS.LEAVE_VIEW);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const sortedPolicies = useMemo(() => {
    return [...policies].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
  }, [policies]);

  const paginatedPolicies = sortedPolicies;

  const [totalPages, setTotalPages] = useState(1);
  const paidCount = useMemo(() => policies.filter((p) => p.is_paid).length, [policies]);
  const activeCount = useMemo(() => policies.filter((p) => p.active).length, [policies]);
  const totalPolicies = policies.length;

  const summaryCards = useMemo(
    () => [
      {
        label: 'Total Policies',
        subtitle: 'Semua aturan',
        value: String(totalPolicies),
        change: 'Data tersimpan di sistem',
        tone: 'purple' as const,
        icon: ShieldCheck,
      },
      {
        label: 'Data Ditampilkan',
        subtitle: 'Policy yang sedang tampil',
        value: String(sortedPolicies.length),
        change: `${paginatedPolicies.length} data per halaman`,
        tone: 'green' as const,
        icon: Search,
      },
      {
        label: 'Cuti Berbayar',
        subtitle: 'Cuti berbayar',
        value: String(paidCount),
        change: 'Berbayar',
        tone: 'blue' as const,
        icon: Clock,
      },
      {
        label: 'Kebijakan Aktif',
        subtitle: 'Policies aktif',
        value: String(activeCount),
        change: 'Siap digunakan',
        tone: 'orange' as const,
        icon: ShieldCheck,
      },
    ],
    [totalPolicies, paidCount, activeCount, sortedPolicies.length, paginatedPolicies.length]
  );

  const fetchPolicies = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.get('/leave-policies');
      let data = response.data;
      if (data && typeof data === 'object') {
        if (Array.isArray(data.data)) data = data.data;
        else if (data.data && Array.isArray(data.data.data)) data = data.data.data;
        else if (Array.isArray(data.items)) data = data.items;
        else if (data.status === 'success' && Array.isArray(data.data)) data = data.data;
      }
      setPolicies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching leave policies:', error);
      setErrorMessage('Gagal memuat kebijakan cuti');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    fetchPolicies();
  }, [canAccess]);

  useEffect(() => {
    setCurrentPage(1);
  }, []);

  if (!canAccess) {
    return (
      <div className="crud-page"><PageHeader
        title="Akses Ditolak"
        subtitle="Anda tidak memiliki izin untuk mengakses halaman ini."
        badge={{ icon: ShieldCheck, label: "Admin Center" }}
      /></div>
    );
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/leave-policies/${id}`);
      fetchPolicies();
      showToast('Kebijakan cuti berhasil dihapus', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Gagal menghapus kebijakan cuti', 'error');
    }
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Leave Policies & Rules"
        subtitle="Tentukan kerangka regulasi dan aturan hak cuti untuk semua kategori."
        badge={{ icon: CalendarDays, label: "Governance" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchPolicies} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={() => (window.location.href = '/leave/policy/create')}>
              <Plus size={16} />
              Konfigurasi Policy
            </button>
          </>
        }
      />

      <div className="employee-summary-wrapper">
        {summaryCards.map((card) => {
          const Icon = card.icon;
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
              <p className="employee-summary-trend">{card.change}</p>
            </div>
          );
        })}
      </div>

      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Kebijakan Cuti</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua kebijakan cuti</p>
          </div>
        </div>
      </Card>

      <Card className="control-section-card">
        <div className="control-section-inner">
          <div className="control-actions">
            <div style={{ color: '#64748b', fontWeight: 600 }}>
              Menampilkan seluruh kebijakan tanpa filter.
            </div>
          </div>
        </div>
      </Card>

      <div className="table-section">
        <div className="wuw-table-area">
          {loading && <LoadingState message="Memuat kebijakan..." />}
          {!loading && errorMessage && <ErrorState message="Koneksi Terputus" error={errorMessage} onRetry={fetchPolicies} />}

          {!loading && !errorMessage && paginatedPolicies.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState title="Belum Ada Data" message="Kami tidak menemukan kebijakan cuti yang tersimpan di sistem." actionLabel="Muat Ulang" onAction={fetchPolicies} />
            </div>
          )}

          {!loading && !errorMessage && paginatedPolicies.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Kebijakan</th>
                      <th>Kode</th>
                      <th>Tipe</th>
                      <th>Jatah (Hari)</th>
                      <th>Sisa Tahun Lalu</th>
                      <th>Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPolicies.map((policy) => (
                      <tr key={policy.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                              <ShieldCheck size={18} />
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{policy.name}</span>
                              <span className="cell-stacked__sub">
                                {policy.entitlement_type === 'accrual' ? 'BERTAHAP' : policy.entitlement_type === 'unlimited' ? 'TIDAK TERBATAS' : 'TETAP'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge-soft badge-soft--blue">{policy.policy_code}</span>
                        </td>
                        <td>
                          <span className={`policy-badge ${policy.is_paid ? 'policy-badge-paid' : 'policy-badge-unpaid'}`}>
                            {policy.is_paid ? 'BERBAYAR' : 'TIDAK BERBAYAR'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: '#1e293b' }}>{policy.entitlement_value} Hari</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                            <Clock size={14} />
                            <span>{policy.max_carryover_days} Hari</span>
                          </div>
                        </td>
                        <td className="td-center">
                          <span className={`badge-soft badge-soft--${policy.active ? 'green' : 'red'}`}>
                            {policy.active ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button className="action-btn action-btn-edit" onClick={() => (window.location.href = `/leave/policy/edit/${policy.id}`)} title="Edit Kebijakan">
                              <Pencil size={16} />
                            </button>
                            <button className="action-btn action-btn-delete" onClick={() => handleDelete(policy.id)} title="Hapus Kebijakan">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <div className="pagination-info">
                  {sortedPolicies.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedPolicies.length)} dari ${sortedPolicies.length} data`}
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                      {page}
                    </button>
                  ))}
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeavePolicyPage;
