import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Package, Laptop, Monitor, Smartphone, Briefcase, ArrowUpFromLine, CheckCircle, Clock, Search, History } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Card, CardHeader, PageHeader } from '@/shared/ui';
import { Button } from '@/shared/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { assetService } from '@/features/assets/api/asset.service';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/employee/EmployeesPage.css';
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";

const MyAssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Semua');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number | string } | null>(null);

  const [returnModal, setReturnModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [returnNote, setReturnNote] = useState('');
  const [returningLoading, setReturningLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await assetService.getMyAssets();
      let data: any[] = [];
      if (response?.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response)) {
        data = response;
      }
      setAssets(data);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || 'Gagal memuat aset');
      setAssets([]);
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

  const getAsset = (item: any) => {
    return item.asset || item;
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((item) => {
      const asset = getAsset(item);
      const searchStr = searchText.toLowerCase();
      const matchesSearch =
        !searchText ||
        asset.name?.toLowerCase().includes(searchStr) ||
        asset.code?.toLowerCase().includes(searchStr) ||
        asset.serial_number?.toLowerCase().includes(searchStr);

      let tabMatch = true;
      if (activeTab === 'Aktif') tabMatch = item.status === 'assigned';
      else if (activeTab === 'Dikembalikan') tabMatch = item.status === 'returned';

      return matchesSearch && tabMatch;
    });
  }, [assets, searchText, activeTab]);

  const paginatedAssets = filteredAssets;
  const [totalPages, setTotalPages] = useState(1);

  const summaryCards = useMemo(
    () => [
      {
        label: 'Total Aset',
        subtitle: 'Aset yang pernah Anda gunakan',
        value: String(assets.length),
        change: 'Data aset tersimpan',
        tone: 'blue' as const,
        icon: Package,
      },
      {
        label: 'Sedang Dipakai',
        subtitle: 'Aset dalam penggunaan Anda',
        value: String(assets.filter((a) => a.status === 'assigned').length),
        change: 'Aktif digunakan',
        tone: 'green' as const,
        icon: CheckCircle,
      },
      {
        label: 'Sudah Dikembalikan',
        subtitle: 'Aset yang sudah dikembalikan',
        value: String(assets.filter((a) => a.status === 'returned').length),
        change: 'Telah dikembalikan',
        tone: 'orange' as const,
        icon: Clock,
      },
    ],
    [assets],
  );

  const clearFilters = () => {
    setSearchText('');
    setActiveTab('Semua');
  };

  const getAssetIcon = (asset: any) => {
    const c = asset.category?.toLowerCase() || '';
    if (c.includes('laptop') || c.includes('macbook') || c.includes('electronics')) return Laptop;
    if (c.includes('mobile') || c.includes('phone') || c.includes('smartphone')) return Smartphone;
    if (c.includes('monitor') || c.includes('display')) return Monitor;
    return Briefcase;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const openReturnModal = (item: any) => {
    setSelectedAssignment(item);
    setReturnNote('');
    setReturnModal(true);
  };

  const closeReturnModal = () => {
    setReturnModal(false);
    setSelectedAssignment(null);
    setReturnNote('');
  };

  const handleReturn = async () => {
    if (!selectedAssignment) return;
    setReturningLoading(true);
    try {
      await assetService.returnAssetByEmployee(selectedAssignment.id, {
        return_note: returnNote,
      });
      closeReturnModal();
      fetchData();
    } catch (error) {
      console.error('Failed to return asset:', error);
    } finally {
      setReturningLoading(false);
    }
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Aset Saya"
        subtitle="Daftar properti perusahaan yang saat ini atau pernah ditugaskan kepada Anda."
        badge={{ icon: Package, label: "Employee Self Service" }}
        actions={
          <button className="btn-outline" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Segarkan
          </button>
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
            <h2 className="analytics-title">Daftar Aset Saya</h2>
            <p className="analytics-subtitle">Semua aset perusahaan yang Anda gunakan</p>
          </div>
        </div>
      </Card>

      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {[
              { value: 'Semua', label: 'Semua' },
              { value: 'Aktif', label: 'Sedang Dipakai' },
              { value: 'Dikembalikan', label: 'Dikembalikan' },
            ].map((tab) => (
              <button
                key={tab.value}
                className={`elyra-tab ${activeTab === tab.value ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari aset..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
          </div>
        </div>
      </Card>

          {loading && <LoadingState message="Memuat aset..." />}
          {!loading && errorMessage && <ErrorState message="Koneksi Terputus" error={errorMessage} onRetry={fetchData} />}

          {!loading && !errorMessage && filteredAssets.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState title="Tidak Ada Aset" message="Anda belum memiliki aset perusahaan yang ditugaskan." actionLabel="Bersihkan Filter" onAction={clearFilters} />
            </div>
          )}

          {!loading && !errorMessage && filteredAssets.length > 0 && (
            <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '300px' }}>Aset</th>
                    <th>Kategori</th>
                    <th>Tanggal Diberikan</th>
                    <th>Serial Number</th>
                    <th className="th-center">Status</th>
                    <th className="th-center" style={{ width: '100px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssets.map((item) => {
                    const asset = getAsset(item);
                    const IconComponent = getAssetIcon(asset);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              <IconComponent size={20} />
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{asset.name || '-'}</span>
                              <span className="cell-stacked__sub">{asset.code || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge-soft badge-soft--purple">{asset.category || '-'}</span>
                        </td>
                        <td>
                          <div className="cell-stacked">
                            <span className="cell-stacked__main" style={{ fontSize: '0.85rem' }}>
                              {formatDate(item.assigned_at || item.created_at)}
                            </span>
                            <span className="cell-stacked__sub">
                              {item.status === 'assigned' ? 'Sedang dipakai' : 'Dikembalikan'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.85rem' }}>
                            {asset.serial_number || '-'}
                          </span>
                        </td>
                        <td className="td-center">
                          <span className={`badge-soft ${
                            item.status === 'assigned' ? 'badge-soft--green' : 'badge-soft--gray'
                          }`}>
                            {item.status === 'assigned' ? 'Aktif' : 'Dikembalikan'}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            {item.status === 'assigned' && (
                              <button
                                className="action-btn"
                                style={{ background: '#fef3c7', color: '#d97706' }}
                                onClick={() => openReturnModal(item)}
                                title="Kembalikan Aset"
                              >
                                <ArrowUpFromLine size={16} />
                              </button>
                            )}
                            <button className="action-btn" style={{ color: '#8b5cf6', background: '#f5f3ff' }} onClick={() => setHistoryModal({ module: 'asset_assignment', id: item.id })} title="Riwayat Approval"><History size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          {totalPages > 1 && (
            <div className="table-pagination">
              <div className="pagination-info">
                Menampilkan {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredAssets.length)} dari {filteredAssets.length}
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
          </>
          )}
        </div>
      </div>

      <Modal
        isOpen={returnModal && !!selectedAssignment}
        onClose={closeReturnModal}
        title="Kembalikan Aset"
        size="md"
        footer={
          <>
            <button className="modal-btn-cancel" onClick={closeReturnModal}>Batal</button>
            <button className="modal-btn-confirm" onClick={handleReturn} disabled={returningLoading}
              style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)' }}
            >
              {returningLoading ? (
                <><RefreshCw size={16} className="animate-spin" /> Memproses...</>
              ) : (
                <><ArrowUpFromLine size={16} /> Kembalikan Aset</>
              )}
            </button>
          </>
        }
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>
          {selectedAssignment && getAsset(selectedAssignment).name} ({selectedAssignment && getAsset(selectedAssignment).code})
        </p>
        <label className="modal-completion-label">Catatan Pengembalian</label>
        <textarea
          className="modal-completion-textarea"
          placeholder="Kondisi aset saat dikembalikan..."
          value={returnNote}
          onChange={(e) => setReturnNote(e.target.value)}
          rows={3}
        />
        <p className="modal-completion-hint">Opsional. Kosongkan jika tidak ada catatan.</p>
      </Modal>
      {historyModal && (
        <ApprovalHistoryModal
          isOpen={!!historyModal}
          onClose={() => setHistoryModal(null)}
          module={historyModal.module}
          moduleId={historyModal.id}
        />
      )}
    </div>
  );
};

export default MyAssetsPage;
