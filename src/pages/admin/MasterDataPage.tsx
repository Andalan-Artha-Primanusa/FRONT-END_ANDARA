import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Edit, Trash2, Search, Building2, Briefcase, Database, CheckCircle } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingState, ErrorState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { api } from '@/shared/api/httpClient';
import { showToast } from '@/shared/ui/toast';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import './MasterDataPage.css';
import { isLegacyPresentationSession } from '@/shared/config/legacyPresentation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartmentItem {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

interface PositionItem {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  level?: string;
  department_id?: number;
}

type ActiveTab = 'department' | 'position';

const tabRoutes: Record<ActiveTab, string> = {
  department: '/organization/master-data/departments',
  position: '/organization/master-data/positions',
};

const getTabFromPath = (pathname: string): ActiveTab => (
  pathname.endsWith('/positions') ? 'position' : 'department'
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Backend returns departments & positions as plain string arrays.
 * Normalise them into objects so the rest of the component stays uniform.
 */
function normalizeDepartments(raw: unknown[]): DepartmentItem[] {
  return raw.map((item, index) => {
    if (typeof item === 'string') {
      return { id: index + 1, name: item, is_active: true };
    }
    return item as DepartmentItem;
  });
}

function normalizePositions(raw: unknown[]): PositionItem[] {
  return raw.map((item, index) => {
    if (typeof item === 'string') {
      return { id: index + 1, name: item, is_active: true };
    }
    return item as PositionItem;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const MasterDataPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => getTabFromPath(location.pathname));

  // Search & Pagination
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DepartmentItem | PositionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ item: DepartmentItem | PositionItem; tab: ActiveTab } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true,
    // Position
    level: 'Mid',
    department_id: '',
  });
  const legacyReadOnly = isLegacyPresentationSession();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // FIX: use the single unified endpoint the backend actually exposes
      const res = await api.get(legacyReadOnly ? '/presentation/legacy/master-data' : '/organization/master-data');
      const payload = res.data?.data ?? res.data ?? {};

      const rawDepts = Array.isArray(payload.departments) ? payload.departments : [];
      const rawPos   = Array.isArray(payload.positions)   ? payload.positions   : [];

      setDepartments(normalizeDepartments(rawDepts));
      setPositions(normalizePositions(rawPos));
    } catch (err) {
      console.error(err);
      setErrorMessage('Gagal memuat master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const currentData: (DepartmentItem | PositionItem)[] = useMemo(() => {
    if (activeTab === 'department') return departments;
    return positions;
  }, [activeTab, departments, positions]);

  const filteredData = useMemo(() => {
    const q = searchText.toLowerCase();
    return currentData.filter((item) =>
      item.name?.toLowerCase().includes(q) ||
      (item.code ?? '').toLowerCase().includes(q)
    );
  }, [currentData, searchText]);

  const sortedData = useMemo(() =>
    [...filteredData].sort((a, b) =>
      (a.name ?? '').toLowerCase().localeCompare((b.name ?? '').toLowerCase())
    ), [filteredData]);

  const paginatedData = sortedData;

  const [totalPages, setTotalPages] = useState(1);

  // Reset page on search / tab change
  useEffect(() => { setCurrentPage(1); }, [searchText, activeTab]);

  // ── CRUD helpers ───────────────────────────────────────────────────────────

  const clearFilters = () => { setSearchText(''); setCurrentPage(1); };

  const handleOpenModal = (item?: DepartmentItem | PositionItem) => {
    if (item) {
      setEditingItem(item);
      const pos = item as PositionItem;
      setFormData({
        name:          item.name ?? '',
        code:          item.code ?? '',
        description:   item.description ?? '',
        is_active:     item.is_active ?? true,
        level:         pos.level ?? 'Mid',
        department_id: pos.department_id?.toString() ?? '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '', code: '', description: '', is_active: true,
        level: 'Mid', department_id: '',
      });
    }
    setShowModal(true);
  };

  /**
   * FIX: After save the component re-fetches the unified endpoint.
   * Optimistic local update is also applied so the table updates immediately
   * even before the re-fetch completes.
   */
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('Nama tidak boleh kosong.', 'info');
      return;
    }

    try {
      if (editingItem) {
        const endpointMap: Record<ActiveTab, string> = {
          department: `/departments/${editingItem.id}`,
          position:   `/positions/${editingItem.id}`,
        };
        await api.put(endpointMap[activeTab], formData);

        const updater = (prev: any[]): any[] =>
          prev.map((i) => i.id === editingItem.id ? { ...i, ...formData } : i);
        if (activeTab === 'department') setDepartments(updater);
        if (activeTab === 'position')   setPositions(updater);

      } else {
        const endpointMap: Record<ActiveTab, string> = {
          department: '/departments',
          position:   '/positions',
        };

        const createRes = await api.post(endpointMap[activeTab], formData);
        const newItem = createRes.data?.data ?? createRes.data;

        if (activeTab === 'department') setDepartments((p) => [...p, newItem]);
        if (activeTab === 'position')   setPositions((p)   => [...p, newItem]);
      }

      setShowModal(false);
      fetchData();
      showToast('Data berhasil disimpan', 'success');

    } catch (err: any) {
      console.error(err);
      showToast(err?.response?.data?.message || err?.message || 'Gagal menyimpan data.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { item, tab } = deleteTarget;
    const endpointMap: Record<ActiveTab, string> = {
      department: `/departments/${item.id}`,
      position:   `/positions/${item.id}`,
    };
    setDeleting(true);
    try {
      await api.delete(endpointMap[tab]);
      showToast(`${tab === 'department' ? 'Departemen' : 'Posisi'} berhasil dihapus`, 'success');
    } catch (err: any) {
      console.warn('DELETE endpoint not available, applying local removal only.');
      showToast(err?.response?.data?.message || err?.message || `Gagal menghapus ${tab}`, 'error');
    }
    // Optimistic removal
    const remover = (prev: any[]): any[] => prev.filter((i) => i.id !== item.id);
    if (tab === 'department') setDepartments(remover);
    if (tab === 'position')   setPositions(remover);
    setDeleteTarget(null);
    setDeleting(false);
    fetchData();
  };

  // ── Tabs config ────────────────────────────────────────────────────────────

  const tabs = [
    { key: 'department' as ActiveTab, label: 'Departemen', icon: Building2, data: departments },
    { key: 'position'   as ActiveTab, label: 'Posisi',   icon: Briefcase,  data: positions  },
  ];

  const activeTabMeta = tabs.find((t) => t.key === activeTab)!;

  // ── Summary cards ──────────────────────────────────────────────────────────

  const totalCount  = departments.length + positions.length;
  const activeCount = currentData.filter((i) => i.is_active !== false).length;

  const summaryCards = useMemo(() => [
    {
      label: 'Total Data', subtitle: 'Semua master data',
      value: String(totalCount), change: 'Data tersimpan di sistem',
      tone: 'blue' as const, icon: Database,
    },
    {
      label: 'Hasil Filter', subtitle: 'Data sesuai pencarian',
      value: String(sortedData.length), change: `${paginatedData.length} data per halaman`,
      tone: 'green' as const, icon: Search,
    },
    {
      label: activeTab === 'department' ? 'Departemen' : 'Posisi',
      subtitle: `Total ${activeTab}`,
      value: String(currentData.length), change: 'Semua data',
      tone: (activeTab === 'department' ? 'orange' : 'purple') as any,
      icon: activeTabMeta.icon,
    },
    {
      label: 'Status Aktif', subtitle: 'Data berstatus aktif',
      value: String(activeCount), change: 'Siap digunakan',
      tone: 'green' as const, icon: CheckCircle,
    },
  ], [totalCount, activeCount, currentData.length, sortedData.length, paginatedData.length, activeTab]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabLabel = (tab: ActiveTab) =>
    tab === 'department' ? 'Departemen' : 'Posisi';

  const openTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    navigate(tabRoutes[tab]);
  };

  return (
    <div className="crud-page">

      <PageHeader
        title="Master Data"
        subtitle="Kelola data inti organisasi: departemen dan posisi."
        badge={{ icon: Database, label: "Organization" }}
        scope
        actions={
          <>
            <button
              className="btn-outline"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            {!legacyReadOnly && (
              <button className="btn-primary" onClick={() => handleOpenModal()}>
                <Plus size={16} />
                Tambah {tabLabel(activeTab)}
              </button>
            )}
          </>
        }
      />

      {/* Summary Cards */}
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

      {/* Analytics Title */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon"><Database size={24} /></div>
          <div>
            <h2 className="analytics-title">{activeTabMeta.label}</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua {activeTab}</p>
          </div>
        </div>
      </Card>

      {/* Table with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`elyra-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => openTab(tab.key)}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder={`Cari ${activeTab}...`}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
            {searchText && (
              <button className="btn-clear-filter" onClick={clearFilters}>Hapus Filter</button>
            )}
          </div>
        </div>
      </Card>

          {loading && <LoadingState message={`Memuat ${activeTab}...`} />}
          {!loading && errorMessage && (
            <ErrorState message="Koneksi Terputus" error={errorMessage} onRetry={fetchData} />
          )}
          {!loading && !errorMessage && paginatedData.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Data Kosong"
                message="Belum ada data atau tidak ada yang sesuai pencarian."
                actionLabel="Bersihkan Filter"
                onAction={clearFilters}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedData.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Kode</th>
                      <th>Deskripsi</th>
                      <th>Status</th>
                      <th className="th-center" style={{ width: 120 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {activeTab === 'department' && <Building2 size={18} />}
                              {activeTab === 'position'   && <Briefcase  size={18} />}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{item.name}</span>
                              <span className="cell-stacked__sub">{item.code || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge-soft badge-soft--blue">{item.code || '-'}</span>
                        </td>
                        <td className="cell-description">{item.description || '-'}</td>
                        <td>
                          <span className={`badge-soft badge-soft--${item.is_active !== false ? 'green' : 'red'}`}>
                            {item.is_active !== false ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            {!legacyReadOnly && <button
                              className="action-btn action-btn-edit"
                              onClick={() => handleOpenModal(item)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>}
                            {!legacyReadOnly && <button
                              className="action-btn action-btn-delete"
                              onClick={() => setDeleteTarget({ item, tab: activeTab })}
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>}
                            {legacyReadOnly && <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Legacy</span>}
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
                  {sortedData.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedData.length)} dari ${sortedData.length} data`}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >{page}</button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? `Edit ${tabLabel(activeTab)}` : `Tambah ${tabLabel(activeTab)}`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSave}>
              {editingItem ? 'Update' : 'Simpan'}
            </Button>
          </>
        }
      >
        <div className="modal-body" style={{ padding: 0 }}>
          <div className="form-group">
            <label>Nama <span className="required">*</span></label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={`Masukkan nama ${activeTab}`} />
          </div>
          <div className="form-group">
            <label>Kode</label>
            <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="cth. DEPT-001" />
          </div>
          <div className="form-group">
            <label>Deskripsi</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={`Deskripsikan ${activeTab}...`} rows={3} />
          </div>
          {activeTab === 'position' && (
            <>
              <div className="form-group">
                <label>Level</label>
                <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })}>
                  <option value="Junior">Junior</option>
                  <option value="Mid">Mid</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>
              <div className="form-group">
                <label>Departemen</label>
                <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}>
                  <option value="">Pilih Departemen</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <label className="checkbox-label">
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
            <span>Aktif</span>
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Hapus ${deleteTarget?.tab === 'position' ? 'Posisi' : 'Departemen'}`}
        message={`${deleteTarget?.tab === 'position' ? 'Posisi' : 'Departemen'} "${deleteTarget?.item.name || 'ini'}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default MasterDataPage;
