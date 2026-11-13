import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Award, Target, Plus, RefreshCw, Pencil, Trash2, Users, CheckCircle, UserPlus, Eye } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingState, ErrorState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { trainingService } from '@/features/training/api/training.service';
import { CompetencyModal } from '@/features/training/components/CompetencyModal';
import { AssignCompetencyModal } from '@/features/training/components/AssignCompetencyModal';
import { AssignedEmployeesModal } from '@/features/training/components/AssignedEmployeesModal';
import { showToast } from '@/shared/ui/toast';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/employee/EmployeesPage.css';

const CompetencyMatrixPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'Semua' | 'Aktif' | 'Tidak Aktif'>('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<any>(null);
  const [assigningCompetency, setAssigningCompetency] = useState<any>(null);
  const [viewingAssigned, setViewingAssigned] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await trainingService.getCompetencies();
      let data: any[] = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        data = response.data;
      }
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat kompetensi.';
      setErrorMessage(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedCategory, activeTab]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(items.map((c) => c.category).filter(Boolean))).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const searchStr = searchText.toLowerCase();
      const nameMatch = item.name?.toLowerCase().includes(searchStr);
      const codeMatch = item.code?.toLowerCase().includes(searchStr);
      const descMatch = item.description?.toLowerCase().includes(searchStr);
      const textMatch = nameMatch || codeMatch || descMatch;
      const catMatch = !selectedCategory || item.category === selectedCategory;
      let statusMatch = true;
      if (activeTab === 'Aktif') statusMatch = item.status === 'active';
      else if (activeTab === 'Tidak Aktif') statusMatch = item.status === 'inactive';
      return textMatch && catMatch && statusMatch;
    });
  }, [items, searchText, selectedCategory, activeTab]);

  const paginatedItems = filteredItems;

  const [totalPages, setTotalPages] = useState(1);

  const activeCount = items.filter((c) => c.status === 'active').length;
  const inactiveCount = items.filter((c) => c.status === 'inactive').length;

  const summaryCards = [
    {
      label: 'Total Kompetensi',
      subtitle: 'Seluruh kompetensi karyawan',
      value: String(items.length),
      change: 'Kompetensi terdaftar',
      tone: 'blue' as const,
      icon: Award,
    },
    {
      label: 'Aktif',
      subtitle: 'Kompetensi yang aktif',
      value: String(activeCount),
      change: 'Kompetensi berlaku',
      tone: 'green' as const,
      icon: CheckCircle,
    },
    {
      label: 'Tidak Aktif',
      subtitle: 'Kompetensi dinonaktifkan',
      value: String(inactiveCount),
      change: 'Kompetensi tidak berlaku',
      tone: 'red' as const,
      icon: Target,
    },
    {
      label: 'Kategori',
      subtitle: 'Jenis kompetensi',
      value: String(uniqueCategories.length),
      change: 'Kategori terdaftar',
      tone: 'purple' as const,
      icon: Users,
    },
  ];

  const clearFilters = () => {
    setSearchText('');
    setSelectedCategory('');
    setActiveTab('Semua');
    setCurrentPage(1);
  };

  const handleSave = async (formData: any) => {
    if (editingCompetency) {
      await trainingService.updateCompetency(editingCompetency.id, formData);
    } else {
      await trainingService.createCompetency(formData);
    }
    setEditingCompetency(null);
    fetchData();
  };

  const handleEdit = (comp: any) => {
    setEditingCompetency(comp);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await trainingService.deleteCompetency(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
      showToast('Kompetensi berhasil dihapus', 'success');
    } catch (err: any) {
      console.error('Gagal menghapus kompetensi', err);
      showToast(err?.response?.data?.message || 'Gagal menghapus kompetensi', 'error');
    }
  };

  const handleAddNew = () => {
    setEditingCompetency(null);
    setIsModalOpen(true);
  };

  const handleAssign = async (competencyId: string | number, employeeId: number, data: { proficiency_level?: number; notes?: string }) => {
    await trainingService.assignCompetency(competencyId, [employeeId], data);
    fetchData();
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Competency Matrix"
        subtitle="Manage employee skills, technical expertise, and core competencies."
        badge={{ icon: Target, label: "Competencies" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={handleAddNew}>
              <Plus size={16} />
              Tambah Kompetensi
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
            <Award size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Kompetensi</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua kompetensi</p>
          </div>
        </div>
      </Card>

      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {(['Semua', 'Aktif', 'Tidak Aktif'] as const).map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari kompetensi..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
            <button
              className={`filter-btn-rounded ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filter-dropdown">
            <div className="filter-row">
              <div className="filter-group">
                <label>Kategori</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-select-premium"
                >
                  <option value="">Semua Kategori</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {(searchText || selectedCategory || activeTab !== 'Semua') && (
                <button className="btn-clear-filter" onClick={clearFilters}>
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

          {loading && <LoadingState message="Memuat kompetensi..." />}
          {!loading && errorMessage && (
            <ErrorState message="Koneksi Terputus" error={errorMessage} onRetry={fetchData} />
          )}
          {!loading && !errorMessage && filteredItems.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pencarian Kosong"
                message="Kami tidak menemukan kompetensi yang sesuai dengan kriteria Anda."
                actionLabel="Bersihkan Filter"
                onAction={clearFilters}
              />
            </div>
          )}
          {!loading && !errorMessage && filteredItems.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '300px' }}>Kompetensi</th>
                      <th>Kode</th>
                      <th>Kategori</th>
                      <th>Deskripsi</th>
                      <th>Ditugaskan</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {item.name ? item.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{item.name}</span>
                              <span className="cell-stacked__sub">{item.category || 'General'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge-soft badge-soft--blue">{item.code || '-'}</span>
                        </td>
                        <td>
                          <span style={{ color: '#475569', fontWeight: 600 }}>{item.category || '-'}</span>
                        </td>
                        <td>
                          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                            {item.description ? (item.description.length > 60 ? item.description.substring(0, 60) + '...' : item.description) : '-'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => setViewingAssigned(item)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <div className="cell-stacked">
                              <span className="cell-stacked__main" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'underline' }}>
                                {item.employee_competencies?.length || 0}
                              </span>
                              <span className="cell-stacked__sub">karyawan</span>
                            </div>
                            <Eye size={14} color="var(--color-primary)" />
                          </button>
                        </td>
                        <td className="td-center">
                          <span className={`badge-soft badge-soft--${item.status === 'active' ? 'green' : 'red'}`}>
                            {item.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn action-btn-secondary"
                              onClick={() => {
                                setAssigningCompetency(item);
                              }}
                              title="Assign"
                            >
                              <UserPlus size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => handleEdit(item)}
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-delete"
                              onClick={() => setDeleteTarget(item)}
                              title="Hapus"
                            >
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

      <CompetencyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCompetency(null);
        }}
        onSave={handleSave}
        initialData={editingCompetency}
      />

      <AssignCompetencyModal
        isOpen={!!assigningCompetency}
        onClose={() => setAssigningCompetency(null)}
        onAssign={handleAssign}
        competencyId={assigningCompetency?.id}
        competencyName={assigningCompetency?.name}
      />

      <AssignedEmployeesModal
        isOpen={!!viewingAssigned}
        onClose={() => setViewingAssigned(null)}
        competencyId={viewingAssigned?.id}
        competencyName={viewingAssigned?.name}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Kompetensi"
        message={`Kompetensi "${deleteTarget?.name || "ini"}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={loading && !!deleteTarget}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default CompetencyMatrixPage;
