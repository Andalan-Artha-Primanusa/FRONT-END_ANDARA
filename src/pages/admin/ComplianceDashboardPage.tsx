import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Plus, RefreshCw, Edit, Search, Shield } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { workforceService } from '@/features/workforce/api/workforce.service';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';

const ComplianceDashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const canAccess = RBACUtils.hasPermission(user, [PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.ADMIN_ACCESS]);
  const navigate = useNavigate();
  const [stats, setStats] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"Semua" | "Critical" | "Medium" | "Compliant">("Semua");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const statsData = await workforceService.getComplianceStats();
      const docsData = await workforceService.getComplianceDocuments();
      const statsArray = Array.isArray(statsData?.payload) ? statsData.payload : [];
      const docsArray = Array.isArray(docsData?.items) ? docsData.items : [];
      setStats(statsArray);
      setDocuments(docsArray);
    } catch (err) {
      console.error(err);
      setErrorMessage('Gagal memuat data kepatuhan');
      setStats([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [canAccess]);

  const summaryStats = useMemo(() => {
    if (!stats || stats.length === 0) return [];
    return stats.map((stat: any) => ({
      label: stat.label,
      value: stat.value,
      color: stat.color,
    }));
  }, [stats]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc: any) => {
      const name = String(doc?.name || '').toLowerCase();
      const docType = String(doc?.doc || '').toLowerCase();
      const query = searchText.toLowerCase();
      const matchSearch = name.includes(query) || docType.includes(query);

      let riskMatch = true;
      if (activeTab === "Critical") riskMatch = doc.risk === 'CRITICAL';
      else if (activeTab === "Medium") riskMatch = doc.risk === 'MEDIUM';
      else if (activeTab === "Compliant") riskMatch = doc.risk === 'LOW' || !doc.risk;

      return matchSearch && riskMatch;
    });
  }, [documents, searchText, activeTab]);

  const paginatedDocuments = filteredDocuments;

  const [totalPages, setTotalPages] = useState(1);

  const clearFilters = () => {
    setSearchText("");
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  if (!canAccess) {
    return (
      <div className="crud-page"><PageHeader
        title="Akses Ditolak"
        subtitle="Anda tidak memiliki izin untuk mengakses halaman ini."
        badge={{ icon: Shield, label: "Admin Center" }}
      /></div>
    );
  }

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title="Dashboard Kepatuhan"
        subtitle="Pantau status kepatuhan regulasi dan kesiapan audit."
        badge={{ icon: Shield, label: "Kepatuhan" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={() => navigate('/compliance/settings')}>
              <Plus size={16} />
              Buat Kebijakan
            </button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryStats.map((card: any) => (
          <div key={card.label} className="employee-summary-card">
            <div className="employee-summary-header">
              <div>
                <p className="employee-summary-label">{card.label}</p>
              </div>
            </div>
            <div className="employee-summary-value" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Status Kepatuhan Dokumen</h2>
            <p className="analytics-subtitle">Pantau dokumen berisiko dan kepatuhan</p>
          </div>
        </div>
      </Card>

      {/* Table Section with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          {/* Tabs */}
          <div className="elyra-tabs">
            {(["Semua", "Critical", "Medium", "Compliant"] as const).map((tab) => (
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
                placeholder="Cari nama karyawan atau jenis dokumen..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
            {(searchText || activeTab !== "Semua") && (
              <button className="btn-clear-filter" onClick={clearFilters}>
                Hapus Filter
              </button>
            )}
          </div>
        </div>
      </Card>

          {loading && <LoadingState message="Memuat data kepatuhan..." />}
          {!loading && errorMessage && (
            <ErrorState message="Koneksi Terputus" error={errorMessage} onRetry={fetchData} />
          )}

          {!loading && !errorMessage && paginatedDocuments.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pencarian Kosong"
                message="Kami tidak menemukan dokumen yang sesuai dengan kriteria Anda."
                actionLabel="Bersihkan Filter"
                onAction={clearFilters}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedDocuments.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nama Karyawan</th>
                      <th>Jenis Dokumen</th>
                      <th>Tgl Kedaluwarsa</th>
                      <th>Status Risk</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocuments.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {(row.name || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{row.name}</span>
                              <span className="cell-stacked__sub">ID: {row.emp_id || `EMP-00${row.id}`}</span>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ color: '#475569', fontWeight: 600 }}>{row.doc || '-'}</span></td>
                        <td>
                          <span style={{ color: row.date === 'Expired' ? '#ef4444' : '#64748b', fontWeight: 500 }}>
                            {row.date || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-soft ${row.risk === 'CRITICAL' ? 'badge-soft--red' : row.risk === 'MEDIUM' ? 'badge-soft--orange' : 'badge-soft--green'}`}>
                            {row.risk || 'LOW'}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => navigate('/compliance/settings')}
                              title="Edit"
                            >
                              <Edit size={16} />
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
                  {filteredDocuments.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredDocuments.length)} dari ${filteredDocuments.length} data`}
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
    </div>
  );
};

export default ComplianceDashboardPage;
