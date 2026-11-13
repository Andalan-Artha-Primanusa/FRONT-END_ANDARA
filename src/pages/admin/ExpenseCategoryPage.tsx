import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Pencil, Trash2, Search, Tag, CheckCircle, FileText, Receipt } from 'lucide-react';
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
import './ExpenseCategoryPage.css';

interface ExpenseCategory {
  id: number;
  name: string;
  code: string;
  description: string;
  max_claim: number | null;
  is_active: boolean;
  requires_receipt: boolean;
  category_type: 'medical' | 'travel' | 'meals' | 'accommodation' | 'transport' | 'other';
}

const ExpenseCategoryPage = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter State
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'Semua' | 'Active' | 'Inactive'>('Semua');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    max_claim: '',
    is_active: true,
    requires_receipt: true,
    category_type: 'other' as const,
  });

  // Extract unique category types
  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(categories.map((c) => c.category_type).filter(Boolean))).sort();
  }, [categories]);

  // Filter & Sort & Paginate
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const searchStr = searchText.toLowerCase();
      const nameMatch = category.name?.toLowerCase().includes(searchStr);
      const codeMatch = category.code?.toLowerCase().includes(searchStr);
      const textMatch = nameMatch || codeMatch;

      let statusMatch = true;
      if (activeTab === 'Active') statusMatch = category.is_active === true;
      else if (activeTab === 'Inactive') statusMatch = category.is_active === false;

      return textMatch && statusMatch;
    });
  }, [categories, searchText, activeTab]);

  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
  }, [filteredCategories]);

  const paginatedCategories = sortedCategories;

  const [totalPages, setTotalPages] = useState(1);

  const activeCount = useMemo(() => categories.filter((c) => c.is_active).length, [categories]);
  const totalCategories = categories.length;

  const summaryCards = useMemo(
    () => [
      {
        label: 'Total Kategori',
        subtitle: 'Semua kategori',
        value: String(totalCategories),
        change: 'Data tersimpan di sistem',
        tone: 'blue' as const,
        icon: Tag,
      },
      {
        label: 'Hasil Filter',
        subtitle: 'Kategori sesuai pencarian',
        value: String(sortedCategories.length),
        change: `${paginatedCategories.length} data per halaman`,
        tone: 'green' as const,
        icon: Search,
      },
      {
        label: 'Kategori Aktif',
        subtitle: 'Status aktif',
        value: String(activeCount),
        change: 'Siap digunakan',
        tone: 'orange' as const,
        icon: CheckCircle,
      },
      {
        label: 'Jenis Kategori',
        subtitle: 'Tipe yang tersedia',
        value: String(uniqueTypes.length),
        change: 'Medical, Travel, dll',
        tone: 'purple' as const,
        icon: FileText,
      },
    ],
    [totalCategories, activeCount, sortedCategories.length, paginatedCategories.length, uniqueTypes.length]
  );

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.get('/expense-categories');
      const data = response.data;
      const categoriesArray = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setCategories(categoriesArray);
    } catch (err) {
      console.error(err);
      setErrorMessage('Gagal memuat kategori');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const handleOpenModal = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        code: category.code,
        description: category.description,
        max_claim: category.max_claim?.toString() || '',
        is_active: category.is_active,
        requires_receipt: category.requires_receipt,
        category_type: category.category_type as any,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        max_claim: '',
        is_active: true,
        requires_receipt: true,
        category_type: 'other',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        max_claim: formData.max_claim ? parseFloat(formData.max_claim) : null,
      };

      if (editingCategory) {
        await api.put(`/expense-categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/expense-categories', payload);
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan kategori', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await api.delete(`/expense-categories/${deleteTarget.id}`);
      showToast('Kategori biaya berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.response?.data?.message || err?.message || 'Gagal menghapus kategori', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setActiveTab('Semua');
    setCurrentPage(1);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      medical: 'Medical',
      travel: 'Travel',
      meals: 'Meals',
      accommodation: 'Accommodation',
      transport: 'Transport',
      other: 'Other',
    };
    return labels[type] || type;
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Expense Categories"
        subtitle="Kelola kategori pengeluaran untuk permintaan reimbursemen."
        badge={{ icon: Receipt, label: "Settings" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={16} />
              Tambah Kategori
            </button>
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

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Tag size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Kategori</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua kategori pengeluaran</p>
          </div>
        </div>
      </Card>

      {/* Control Section */}
      <Card className="control-section-card">
        <div className="control-section-inner">
          {/* Tabs */}
          <div className="elyra-tabs">
            {(['Semua', 'Active', 'Inactive'] as const).map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? 'active' : ''}`}
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
                placeholder="Cari kategori..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
            {(searchText || activeTab !== 'Semua') && (
              <button className="btn-clear-filter" onClick={clearFilters}>
                Hapus Filter
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <div className="table-section">
        <div className="wuw-table-area">
          {loading && <LoadingState message="Memuat kategori..." />}
          {!loading && errorMessage && (
            <ErrorState message="Koneksi Terputus" error={errorMessage} onRetry={fetchData} />
          )}

          {!loading && !errorMessage && paginatedCategories.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pencarian Kosong"
                message="Kami tidak menemukan kategori yang sesuai dengan kriteria Anda."
                actionLabel="Bersihkan Filter"
                onAction={clearFilters}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedCategories.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nama Kategori</th>
                      <th>Kode</th>
                      <th>Tipe</th>
                      <th>Max Claim</th>
                      <th>Receipt</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCategories.map((category) => (
                      <tr key={category.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {category.name ? category.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{category.name}</span>
                              <span className="cell-stacked__sub">{category.description || 'No description'}</span>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ color: '#475569', fontWeight: 600 }}>{category.code}</span></td>
                        <td>
                          <span className="badge-soft badge-soft--purple">
                            {getTypeLabel(category.category_type)}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>
                            {category.max_claim ? `Rp ${Number(category.max_claim).toLocaleString('id-ID')}` : 'Unlimited'}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#64748b' }}>
                            {category.requires_receipt ? 'Required' : 'Optional'}
                          </span>
                        </td>
                        <td className="td-center">
                          <span className={`badge-soft badge-soft--${category.is_active ? 'green' : 'red'}`}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => handleOpenModal(category)}
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-delete"
                              onClick={() => setDeleteTarget(category)}
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

              {/* Pagination */}
              <div className="table-pagination">
                <div className="pagination-info">
                  {sortedCategories.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedCategories.length)} dari ${sortedCategories.length} data`}
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

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSave}>
              {editingCategory ? 'Update' : 'Tambah'}
            </Button>
          </>
        }
      >
        <div className="modal-body" style={{ padding: 0 }}>
          <div className="form-row">
            <div className="form-group">
              <label>Nama Kategori <span className="required">*</span></label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Medical Expenses" />
            </div>
            <div className="form-group">
              <label>Kode <span className="required">*</span></label>
              <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g., MED" />
            </div>
          </div>
          <div className="form-group">
            <label>Deskripsi</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Deskripsikan kategori ini..." rows={3} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Max Claim</label>
              <input type="text" inputMode="numeric" value={formData.max_claim ? Number(formData.max_claim).toLocaleString("id-ID") : ""} onChange={(e) => setFormData({ ...formData, max_claim: e.target.value.replace(/\D/g, "") })} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Tipe Kategori</label>
              <select value={formData.category_type} onChange={(e) => setFormData({ ...formData, category_type: e.target.value as any })}>
                <option value="medical">Medical</option>
                <option value="travel">Travel</option>
                <option value="meals">Meals</option>
                <option value="accommodation">Accommodation</option>
                <option value="transport">Transport</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-row checkboxes">
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
              <span>Active</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.requires_receipt} onChange={(e) => setFormData({ ...formData, requires_receipt: e.target.checked })} />
              <span>Requires Receipt</span>
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Kategori Expense"
        message={`Kategori "${deleteTarget?.name || 'ini'}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default ExpenseCategoryPage;
