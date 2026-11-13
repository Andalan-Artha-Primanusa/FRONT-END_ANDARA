import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, Handshake, Search, Filter,Box,CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { assetService } from '@/features/assets/api/asset.service';
import { AssignAssetModal } from '@/features/assets/components/AssignAssetModal';
import { ReturnAssetModal } from '@/features/assets/components/ReturnAssetModal';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './AssetAssignmentsPage.css';

const formatDateTime = (input: string) => {
  if (!input) return 'N/A';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
};

const AssetAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter & Pagination State
  const [activeTab, setActiveTab] = useState<"Semua" | "Active" | "Returned">("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [returnTarget, setReturnTarget] = useState<{ id: string | number; name: string } | null>(null);
  const [returning, setReturning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, assetsRes] = await Promise.all([
        assetService.getAssignments(),
        assetService.getAssets(),
      ]);

      // Extract assignments
      let assignmentsArray: any[] = [];
      if (assignmentsRes?.data?.data && Array.isArray(assignmentsRes.data.data)) {
        assignmentsArray = assignmentsRes.data.data;
      } else if (assignmentsRes?.data && Array.isArray(assignmentsRes.data)) {
        assignmentsArray = assignmentsRes.data;
      } else if (Array.isArray(assignmentsRes)) {
        assignmentsArray = assignmentsRes;
      }

      // Extract assets
      let assetsArray: any[] = [];
      if (assetsRes?.data?.data && Array.isArray(assetsRes.data.data)) {
        assetsArray = assetsRes.data.data;
      } else if (assetsRes?.data && Array.isArray(assetsRes.data)) {
        assetsArray = assetsRes.data;
      } else if (Array.isArray(assetsRes)) {
        assetsArray = assetsRes;
      }

      setAssignments(assignmentsArray);
      setAssets(assetsArray);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filter Logic
  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const searchStr = searchQuery.toLowerCase();
      const assetName = (assignment.asset?.name || '').toLowerCase();
      const employeeName = (
        assignment.employee?.user?.name ||
        assignment.employee?.full_name ||
        assignment.employee?.name ||
        ''
      ).toLowerCase();
      const assetCode = (assignment.asset?.code || '').toLowerCase();

      const textMatch = assetName.includes(searchStr) ||
                       employeeName.includes(searchStr) ||
                       assetCode.includes(searchStr);

      const isReturned = !!assignment.returned_at;
      let statusMatch = true;
      if (activeTab === "Active") statusMatch = !isReturned;
      else if (activeTab === "Returned") statusMatch = isReturned;

      return textMatch && statusMatch;
    });
  }, [assignments, searchQuery, activeTab]);

  // Sort by assigned date (newest first)
  const sortedAssignments = useMemo(() => {
    return [...filteredAssignments].sort((a, b) => {
      const dateA = new Date(a.assigned_at || a.assignment_date || a.created_at || 0).getTime();
      const dateB = new Date(b.assigned_at || b.assignment_date || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredAssignments]);

  // Paginate
  const paginatedAssignments = sortedAssignments;

  const [totalPages, setTotalPages] = useState(1);

  // Summary Cards
  const summaryCards = useMemo(() => [
    {
      label: "Total Penugasan",
      subtitle: "Seluruh penugasan aset",
      value: String(assignments.length),
      change: "Data penugasan",
      tone: "blue" as const,
      icon: Handshake,
    },
    {
      label: "Hasil Filter",
      subtitle: "Penugasan sesuai pencarian",
      value: String(sortedAssignments.length),
      change: `${paginatedAssignments.length} data per halaman`,
      tone: "green" as const,
      icon: Search,
    },
    {
      label: "Aktif",
      subtitle: "Penugasan yang sedang berlangsung",
      value: String(assignments.filter(a => !a.returned_at).length),
      change: "Dalam penggunaan",
      tone: "orange" as const,
      icon: CheckCircle,
    },
    {
      label: "Dikembalikan",
      subtitle: "Penugasan yang sudah selesai",
      value: String(assignments.filter(a => !!a.returned_at).length),
      change: "Sudah kembali",
      tone: "purple" as const,
      icon: XCircle,
    },
  ], [assignments, sortedAssignments.length, paginatedAssignments.length]);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  const handleReturn = async (data: { return_note: string; returned_at: string; condition: string }) => {
    if (!returnTarget) return;
    setReturning(true);
    try {
      await assetService.returnAsset(returnTarget.id, data);
      setReturnTarget(null);
      fetchData();
    } catch (error) {
      console.error('Failed to return asset:', error);
    } finally {
      setReturning(false);
    }
  };

  const getStatusBadge = (assignment: any) => {
    const isReturned = !!assignment.returned_at;
    if (isReturned) {
      return <span className="badge-soft badge-soft--gray">Dikembalikan</span>;
    }
    return <span className="badge-soft badge-soft--green">Aktif</span>;
  };

  return (
    <div className="crud-page assignments-page">
      {/* Header */}
      <PageHeader
        title="Penugasan Aset"
        subtitle="Lacak dan kelola semua properti perusahaan yang dipinjamkan kepada karyawan."
        badge={{ icon: Handshake, label: "Inventaris" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={() => setShowAssignModal(true)}>
              <Plus size={16} />
              Buat Penugasan
            </button>
          </>
        }
      />
      {/* Summary Cards */}
      <div className="assign-summary-wrapper">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="assign-summary-card">
              <div className="assign-summary-header">
                <div>
                  <p className="assign-summary-label">{card.label}</p>
                  <p className="assign-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`assign-summary-icon-wrapper assign-icon-${card.tone}`}>
                  <Icon size={28} />
                </div>
              </div>
              <div className={`assign-summary-value assign-value-${card.tone}`}>{card.value}</div>
              <p className="assign-summary-trend">{card.change}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Handshake size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Penugasan</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua penugasan aset</p>
          </div>
        </div>
      </Card>

      {/* Control Section */}
      <Card className="control-section-card">
        <div className="control-section-inner">
          {/* Tabs */}
          <div className="elyra-tabs">
            {(["Semua", "Active", "Returned"] as const).map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari penugasan..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="search-input-pill"
              />
            </div>
            <button
              className={`filter-btn-rounded ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-dropdown">
            <div className="filter-row">
              {(searchQuery || activeTab !== "Semua") && (
                <button className="btn-clear-filter" onClick={clearFilters}>
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Table Section */}
      <div className="table-section">
        <div className="wuw-table-area">
          {loading && <LoadingState message="Memuat penugasan..." />}

          {!loading && paginatedAssignments.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pencarian Kosong"
                message="Kami tidak menemukan penugasan yang sesuai dengan kriteria Anda."
                actionLabel="Bersihkan Filter"
                onAction={clearFilters}
              />
            </div>
          )}

          {!loading && paginatedAssignments.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '400px' }}>Penugasan</th>
                      <th>Karyawan</th>
                      <th>Tanggal Pinjam</th>
                      <th>Tanggal Kembali</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAssignments.map((assignment) => {
                      const employeeName = assignment.employee?.user?.name ||
                                          assignment.employee?.full_name ||
                                          assignment.employee?.name ||
                                          'Unknown';
                      const assetName = assignment.asset?.name || 'Unknown Asset';
                      const assetCode = assignment.asset?.code || 'NO-CODE';

                      return (
                        <tr key={assignment.id}>
                          <td>
                            <div className="cell-name">
                              <div className="cell-avatar">
                                <Box size={20} />
                              </div>
                              <div className="cell-stacked">
                                <span className="cell-name-text">{assetName}</span>
                                <span className="cell-stacked__sub">{assetCode}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="cell-name">
                              <div className="cell-avatar">
                                {employeeName.charAt(0).toUpperCase()}
                              </div>
                              <div className="cell-stacked">
                                <span className="cell-name-text">{employeeName}</span>
                                <span className="cell-stacked__sub">
                                  {assignment.employee?.department?.name || 'No Dept'} • {assignment.employee?.position?.name || 'No Pos'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="cell-stacked">
                              <span className="cell-stacked__main" style={{ fontSize: '0.85rem' }}>
                                {formatDateTime(assignment.assigned_at || assignment.assignment_date || assignment.created_at)}
                              </span>
                              <span className="cell-stacked__sub">Tanggal pinjam</span>
                            </div>
                          </td>
                          <td>
                            <div className="cell-stacked">
                              <span className="cell-stacked__main" style={{ fontSize: '0.85rem' }}>
                                {assignment.returned_at ? formatDateTime(assignment.returned_at) : '-'}
                              </span>
                              <span className="cell-stacked__sub">Tanggal kembali</span>
                            </div>
                          </td>
                          <td className="td-center">
                            {getStatusBadge(assignment)}
                          </td>
                          <td className="td-center">
                            <div className="action-btn-group">
                              {!assignment.returned_at && (
                                <button
                                  className="action-btn action-btn-return"
                                  onClick={() => setReturnTarget({ 
                                    id: assignment.id, 
                                    name: assignment.asset?.name || 'Asset' 
                                  })}
                                  title="Proses Pengembalian"
                                >
                                  <CheckCircle size={16} />
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

              {/* Pagination */}
              <div className="table-pagination">
                <div className="pagination-info">
                  {sortedAssignments.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedAssignments.length)} dari ${sortedAssignments.length} data`}
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

      {/* Assign Modal */}
      <AssignAssetModal 
        isOpen={showAssignModal} 
        onClose={() => setShowAssignModal(false)} 
        onSave={async (formData: any) => {
          await assetService.assignAsset(formData.asset_id, {
            employee_id: formData.employee_id,
            assignment_note: formData.assignment_note,
            assigned_at: formData.assigned_at,
          });
          setShowAssignModal(false);
          fetchData();
        }}
        assets={assets.filter(a => a.status?.toLowerCase() === 'available')}
      />

      {/* Return Modal */}
      {returnTarget && (
        <ReturnAssetModal 
          isOpen={!!returnTarget} 
          onClose={() => setReturnTarget(null)} 
          onConfirm={handleReturn}
          assetName={returnTarget.name}
          loading={returning}
        />
      )}
    </div>
  );
};

export default AssetAssignmentsPage;
