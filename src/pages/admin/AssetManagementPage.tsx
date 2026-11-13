import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Package, Search, Filter, Laptop, Monitor, Smartphone, Briefcase, User, Trash2, Pencil, CheckCircle2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { assetService } from '@/features/assets/api/asset.service';
import { api } from '@/shared/api/httpClient';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/employee/EmployeesPage.css';
import './AssetInventoryPage.css';
import { showToast } from '@/shared/ui/toast';
import CompanyScopeBadge from "@/shared/components/CompanyScopeBadge";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";

const getAssetIcon = (category: string) => {
  const c = category?.toLowerCase() || '';
  if (c.includes('laptop') || c.includes('macbook') || c.includes('electronics')) return Laptop;
  if (c.includes('mobile') || c.includes('phone') || c.includes('smartphone')) return Smartphone;
  if (c.includes('monitor') || c.includes('display')) return Monitor;
  return Briefcase;
};

const AssetManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canCreate = RBACUtils.hasPermission(user, PERMISSIONS.ASSET_CREATE);
  const canUpdate = RBACUtils.hasPermission(user, PERMISSIONS.ASSET_UPDATE);
  const canDelete = RBACUtils.hasPermission(user, PERMISSIONS.ASSET_DELETE);
  const canAssign = RBACUtils.hasPermission(user, PERMISSIONS.ASSET_ASSIGN);
  const [assets, setAssets] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Semua' | 'Tersedia' | 'Digunakan' | 'Perbaikan' | 'Dihapus'>('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [returnNote, setReturnNote] = useState('');
  const [returningLoading, setReturningLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const [assetsRes, assignmentsRes] = await Promise.all([
        assetService.getAssets(),
        assetService.getAssignments().catch(() => ({})),
      ]);
      let assetsArray: any[] = [];
      if (assetsRes?.data?.data && Array.isArray(assetsRes.data.data)) assetsArray = assetsRes.data.data;
      else if (assetsRes?.data && Array.isArray(assetsRes.data)) assetsArray = assetsRes.data;
      else if (Array.isArray(assetsRes)) assetsArray = assetsRes;
      setAssets(assetsArray);

      let assignmentsArray: any[] = [];
      if (assignmentsRes?.data?.data && Array.isArray(assignmentsRes.data.data)) assignmentsArray = assignmentsRes.data.data;
      else if (assignmentsRes?.data && Array.isArray(assignmentsRes.data)) assignmentsArray = assignmentsRes.data;
      else if (Array.isArray(assignmentsRes)) assignmentsArray = assignmentsRes;
      setAssignments(assignmentsArray);
    } catch (error: any) {
      console.error('Failed to fetch assets:', error);
      showToast(error?.response?.data?.message || error?.message || 'Gagal memuat aset', 'error');
      setAssets([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const assetEmployeeMap = useMemo(() => {
    const map = new Map<string | number, string>();
    assignments.forEach((a) => {
      if (!a.returned_at && a.status !== 'rejected') {
        const employeeName = a.employee?.user?.name || a.employee?.full_name || a.employee?.name;
        if (employeeName && a.asset?.id) {
          map.set(a.asset.id, employeeName);
        }
      }
    });
    return map;
  }, [assignments]);

  useEffect(() => { fetchAssets(); }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/employees');
        let list = res?.data?.data?.data || res?.data?.data || res?.data || [];
        if (!Array.isArray(list)) list = [];
        setEmployees(list);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  const openAssignModal = (asset: any) => {
    if (!canAssign) {
      showToast('Anda tidak memiliki izin menugaskan aset', 'error');
      return;
    }
    setSelectedAsset(asset);
    setSelectedEmployee('');
    setAssignmentNote('');
    setAssignModal(true);
  };

  const closeAssignModal = () => {
    setAssignModal(false);
    setSelectedAsset(null);
    setSelectedEmployee('');
    setAssignmentNote('');
  };

  const handleAssign = async () => {
    if (!canAssign) {
      showToast('Anda tidak memiliki izin menugaskan aset', 'error');
      return;
    }
    if (!selectedAsset || !selectedEmployee) return;
    setAssigningLoading(true);
    try {
      await assetService.assignAsset(selectedAsset.id, {
        employee_id: selectedEmployee,
        assignment_note: assignmentNote,
      });
      closeAssignModal();
      showToast('Aset berhasil ditugaskan', 'success');
      fetchAssets();
    } catch (error: any) {
      console.error('Failed to assign asset:', error);
      showToast(error?.response?.data?.message || error?.message || 'Gagal menugaskan aset', 'error');
    } finally {
      setAssigningLoading(false);
    }
  };

  const openReturnModal = (asset: any) => {
    if (!canAssign) {
      showToast('Anda tidak memiliki izin mengembalikan aset', 'error');
      return;
    }
    const currentAssignment = asset.assignments?.find((a: any) => a.status === 'assigned');
    setSelectedAssignment(currentAssignment);
    setReturnNote('');
    setReturnModal(true);
  };

  const closeReturnModal = () => {
    setReturnModal(false);
    setSelectedAssignment(null);
    setReturnNote('');
  };

  const handleReturn = async () => {
    if (!canAssign) {
      showToast('Anda tidak memiliki izin mengembalikan aset', 'error');
      return;
    }
    if (!selectedAssignment) return;
    setReturningLoading(true);
    try {
      await assetService.returnAsset(selectedAssignment.id, {
        return_note: returnNote,
        condition: 'good',
      });
      closeReturnModal();
      showToast('Aset berhasil dikembalikan', 'success');
      fetchAssets();
    } catch (error: any) {
      console.error('Failed to return asset:', error);
      showToast(error?.response?.data?.message || error?.message || 'Gagal mengembalikan aset', 'error');
    } finally {
      setReturningLoading(false);
    }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const searchStr = searchQuery.toLowerCase();
      const nameMatch = asset.name?.toLowerCase().includes(searchStr);
      const codeMatch = asset.code?.toLowerCase().includes(searchStr);
      const serialMatch = asset.serial_number?.toLowerCase().includes(searchStr);
      const brandMatch = asset.brand?.toLowerCase().includes(searchStr);
      const textMatch = nameMatch || codeMatch || serialMatch || brandMatch;

      let statusMatch = true;
      if (activeTab === 'Tersedia') statusMatch = asset.status?.toLowerCase() === 'available';
      else if (activeTab === 'Digunakan') statusMatch = asset.status?.toLowerCase() === 'assigned';
      else if (activeTab === 'Perbaikan') statusMatch = asset.status?.toLowerCase() === 'maintenance';
      else if (activeTab === 'Dihapus') statusMatch = asset.status?.toLowerCase() === 'retired';

      return textMatch && statusMatch;
    });
  }, [assets, searchQuery, activeTab]);

  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      const dateA = new Date(a.purchase_date || 0).getTime();
      const dateB = new Date(b.purchase_date || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredAssets]);

  const paginatedAssets = sortedAssets;

  const [totalPages, setTotalPages] = useState(1);

  const summaryCards = useMemo(() => [
    { label: 'Total Aset', subtitle: 'Seluruh aset perusahaan', value: String(assets.length), change: 'Data aset tersimpan', tone: 'blue' as const, icon: Package },
    { label: 'Hasil Filter', subtitle: 'Aset sesuai pencarian', value: String(sortedAssets.length), change: `${paginatedAssets.length} data per halaman`, tone: 'green' as const, icon: Search },
    { label: 'Tersedia', subtitle: 'Aset yang tersedia', value: String(assets.filter(a => a.status?.toLowerCase() === 'available').length), change: 'Siap digunakan', tone: 'orange' as const, icon: CheckCircle2 },
    { label: 'Digunakan', subtitle: 'Aset yang sedang digunakan', value: String(assets.filter(a => a.status?.toLowerCase() === 'assigned').length), change: 'Dalam penggunaan', tone: 'purple' as const, icon: User },
  ], [assets, sortedAssets.length, paginatedAssets.length]);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveTab('Semua');
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) {
      showToast('Anda tidak memiliki izin menghapus aset', 'error');
      return;
    }
    setDeleting(true);
    try {
      await assetService.deleteAsset(deleteTarget.id);
      showToast('Aset berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchAssets();
    } catch (error: any) {
      console.error('Failed to delete asset:', error);
      showToast(error?.response?.data?.message || error?.message || 'Gagal menghapus aset', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      'available': { label: 'Tersedia', class: 'badge-soft--green' },
      'assigned': { label: 'Digunakan', class: 'badge-soft--blue' },
      'maintenance': { label: 'Perbaikan', class: 'badge-soft--yellow' },
      'retired': { label: 'Dihapus', class: 'badge-soft--gray' },
    };
    const info = statusMap[status?.toLowerCase()] || { label: status, class: 'badge-soft--gray' };
    return <span className={`badge-soft ${info.class}`}>{info.label}</span>;
  };

  const getAssignedEmployee = (asset: any) => {
    if (assetEmployeeMap?.has(asset.id)) {
      return assetEmployeeMap.get(asset.id);
    }
    const currentAssignment = asset.assignments?.find((a: any) => a.status === 'assigned');
    if (!currentAssignment) return null;
    return currentAssignment.employee?.user?.name || currentAssignment.employee?.full_name || '-';
  };

  return (
    <div className="crud-page asset-page">
      <PageHeader
        title="Aset & Properti"
        subtitle="Pantau distribusi, kondisi, dan status kepemilikan aset perusahaan secara terpusat."
        badge={{ icon: Package, label: "Inventaris Perusahaan" }}
        scope
        actions={
          <>
            {canCreate && (
            <button className="btn-primary" onClick={() => navigate('/inventory/assets/create')}>
              <Plus size={16} />
              Buat Aset Baru
            </button>
            )}
            <button className="btn-outline" onClick={() => { fetchAssets(); }} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
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
            <Package size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Aset</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua aset perusahaan</p>
          </div>
        </div>
      </Card>

      <div className="table-section asset-table-section">
        <div className="wuw-table-area">
          <div className="table-toolbar">
            <div className="control-section-inner">
              <div className="elyra-tabs">
                {(['Semua', 'Tersedia', 'Digunakan', 'Perbaikan', 'Dihapus'] as const).map((tab) => (
                  <button key={tab} className={`elyra-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); setCurrentPage(1); }}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="control-actions">
                <div className="search-box">
                  <div className="search-icon-inside"><Search size={18} /></div>
                  <input type="text" placeholder="Cari aset..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="search-input-pill" />
                </div>
                <button className={`filter-btn-rounded ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
                  <Filter size={18} />
                  <span>Filter</span>
                </button>
              </div>
            </div>
            {showFilters && (
              <div className="filter-dropdown">
                <div className="filter-row">
                  {(searchQuery || activeTab !== 'Semua') && <button className="btn-clear-filter" onClick={clearFilters}>Hapus Filter</button>}
                </div>
              </div>
            )}
          </div>
          {loading && <LoadingState message="Memuat aset..." />}
          {!loading && paginatedAssets.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState title="Pencarian Kosong" message="Tidak ada aset yang sesuai dengan kriteria Anda." actionLabel="Bersihkan Filter" onAction={clearFilters} />
            </div>
          )}
          {!loading && paginatedAssets.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '350px' }}>Aset</th>
                      <th>Kode</th>
                      <th>Dipakai Oleh</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '150px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAssets.map((asset) => {
                      const IconComponent = getAssetIcon(asset.category);
                      const assignedTo = getAssignedEmployee(asset);
                      return (
                        <tr key={asset.id}>
                          <td>
                            <div className="cell-name">
                              <div className="cell-avatar"><IconComponent size={20} /></div>
                              <div className="cell-stacked">
                                <span className="cell-name-text">{asset.name}</span>
                                <span className="cell-stacked__sub">{asset.serial_number || '-'}</span>
                              </div>
                            </div>
                          </td>
                          <td><span style={{ color: '#475569', fontWeight: 600 }}>{asset.code || '-'}</span></td>
                          <td>{assignedTo ? (
                            <div className="cell-stacked">
                              <span className="cell-stacked__main" style={{ fontSize: '0.85rem' }}>{assignedTo}</span>
                              <span className="cell-stacked__sub">Sedang dipakai</span>
                            </div>
                          ) : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>}</td>
                          <td className="td-center">{getStatusBadge(asset.status)}</td>
                          <td className="td-center">
                            <div className="action-btn-group">
                              {canAssign && asset.status?.toLowerCase() === 'available' && (
                                <button className="action-btn" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }} onClick={() => openAssignModal(asset)} title="Assign ke Karyawan">
                                  <ArrowDownToLine size={16} />
                                </button>
                              )}
                              {canAssign && asset.status?.toLowerCase() === 'assigned' && (
                                <button className="action-btn" style={{ background: '#fef3c7', color: '#d97706' }} onClick={() => openReturnModal(asset)} title="Kembalikan Aset">
                                  <ArrowUpFromLine size={16} />
                                </button>
                              )}
                              {canUpdate && <button className="action-btn action-btn-edit" onClick={() => navigate(`/inventory/assets/edit/${asset.id}`)} title="Edit">
                                <Pencil size={16} />
                              </button>}
                              {canDelete && <button className="action-btn action-btn-delete" onClick={() => setDeleteTarget(asset)} title="Hapus">
                                <Trash2 size={16} />
                              </button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="table-pagination">
                <div className="pagination-info">
                  {sortedAssets.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedAssets.length)} dari ${sortedAssets.length} data`}
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                  ))}
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={canAssign && assignModal && !!selectedAsset} onClose={closeAssignModal} title="Tugaskan Aset" size="md"
        footer={canAssign ? <>
          <button className="modal-btn-cancel" onClick={closeAssignModal}>Batal</button>
          <button className="modal-btn-confirm" onClick={handleAssign} disabled={assigningLoading || !selectedEmployee}>
            {assigningLoading ? <><RefreshCw size={16} className="animate-spin" /> Menyimpan...</> : <><ArrowDownToLine size={16} /> Tugaskan</>}
          </button>
        </> : undefined}
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>{selectedAsset?.name} ({selectedAsset?.code})</p>
        <label className="modal-completion-label">Pilih Karyawan</label>
        <select className="modal-completion-select" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
          <option value="">-- Pilih Karyawan --</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.user?.name || emp.full_name || `Karyawan #${emp.id}`} - {emp.position || '-'}</option>
          ))}
        </select>
        <label className="modal-completion-label" style={{ marginTop: '1rem' }}>Catatan Assignment</label>
        <textarea className="modal-completion-textarea" placeholder="Catatan tambahan (opsional)..." value={assignmentNote} onChange={(e) => setAssignmentNote(e.target.value)} rows={3} />
      </Modal>

      <Modal isOpen={canAssign && returnModal && !!selectedAssignment} onClose={closeReturnModal} title="Kembalikan Aset" size="md"
        footer={canAssign ? <>
          <button className="modal-btn-cancel" onClick={closeReturnModal}>Batal</button>
          <button className="modal-btn-confirm" onClick={handleReturn} disabled={returningLoading} style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)' }}>
            {returningLoading ? <><RefreshCw size={16} className="animate-spin" /> Memproses...</> : <><ArrowUpFromLine size={16} /> Kembalikan</>}
          </button>
        </> : undefined}
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>Dari: {selectedAssignment?.employee?.user?.name || selectedAssignment?.employee?.full_name || '-'}</p>
        <label className="modal-completion-label">Catatan Pengembalian</label>
        <textarea className="modal-completion-textarea" placeholder="Kondisi aset saat dikembalikan..." value={returnNote} onChange={(e) => setReturnNote(e.target.value)} rows={3} />
        <p className="modal-completion-hint">Opsional. Kosongkan jika tidak ada catatan.</p>
      </Modal>
      <ConfirmDialog
        isOpen={canDelete && !!deleteTarget}
        title="Hapus Aset"
        message={`Aset "${String(deleteTarget?.name || 'ini')}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AssetManagementPage;
