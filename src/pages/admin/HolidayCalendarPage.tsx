import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, RefreshCw, Edit, Trash2, CalendarDays, Search } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingState, ErrorState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { workforceService } from '@/features/workforce/api/workforce.service';
import { showToast } from '@/shared/ui/toast';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';

const HolidayCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Search & Filter
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"Semua" | "National" | "Company">("Semua");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await workforceService.getHolidays();
      setHolidays(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setErrorMessage('Gagal memuat hari libur');
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const summaryStats = useMemo(() => {
    const total = holidays.length;
    const national = holidays.filter((h: any) => h.type === 'national').length;
    const company = holidays.filter((h: any) => h.type === 'company').length;
    const upcoming = holidays.filter((h: any) => new Date(h.date) > new Date()).length;

    return [
      { label: "Total Libur", subtitle: "Seluruh hari libur", value: total, tone: "blue" as const },
      { label: "Nasional", subtitle: "Hari libur nasional", value: national, tone: "red" as const },
      { label: "Perusahaan", subtitle: "Hari libur perusahaan", value: company, tone: "orange" as const },
      { label: "Akan Datang", subtitle: "Hari libur mendatang", value: upcoming, tone: "green" as const },
    ];
  }, [holidays]);

  const filteredHolidays = useMemo(() => {
    return holidays.filter((holiday: any) => {
      const name = String(holiday?.name || '').toLowerCase();
      const description = String(holiday?.description || '').toLowerCase();
      const query = searchText.toLowerCase();
      const matchSearch = name.includes(query) || description.includes(query);

      let typeMatch = true;
      if (activeTab === "National") typeMatch = holiday.type === 'national';
      else if (activeTab === "Company") typeMatch = holiday.type === 'company';

      return matchSearch && typeMatch;
    });
  }, [holidays, searchText, activeTab]);

  const paginatedHolidays = filteredHolidays;

  const [totalPages, setTotalPages] = useState(1);

  const clearFilters = () => {
    setSearchText("");
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await workforceService.deleteHoliday(deleteTarget.id);
      showToast('Hari libur berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete holiday:', error);
      showToast(error?.response?.data?.message || error?.message || 'Gagal menghapus hari libur', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Kalender Libur"
        subtitle="Kelola hari libur nasional dan kebijakan libur perusahaan."
        badge={{ icon: CalendarDays, label: "Workforce" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={() => navigate('/workforce/holidays/create')}>
              <Plus size={16} />
              Tambah Libur
            </button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryStats.map((card) => {
          const Icon = card.tone === "blue" ? Calendar : card.tone === "red" ? CalendarDays : Calendar;
          
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
              <p className="employee-summary-trend">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Hari Libur</h2>
            <p className="analytics-subtitle">Kelola hari libur nasional dan perusahaan</p>
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
            {(["Semua", "National", "Company"] as const).map((tab) => (
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
                placeholder="Cari nama atau deskripsi libur..."
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

          {loading && <LoadingState message="Memuat data hari libur..." />}
          {!loading && errorMessage && <ErrorState message="Koneksi Terputus" error={errorMessage} onRetry={fetchData} />}

          {!loading && !errorMessage && paginatedHolidays.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pencarian Kosong"
                message="Kami tidak menemukan hari libur yang sesuai dengan kriteria Anda."
                actionLabel="Bersihkan Filter"
                onAction={clearFilters}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedHolidays.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Hari Libur</th>
                      <th>Tanggal</th>
                      <th>Tipe</th>
                      <th>Berulang</th>
                      <th>Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHolidays.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {(h.name || 'H').charAt(0).toUpperCase()}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{h.name}</span>
                              <span className="cell-stacked__sub">{h.description || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: '#475569', fontWeight: 600 }}>
                            {h.date ? new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-soft ${h.type === 'national' ? 'badge-soft--blue' : 'badge-soft--purple'}`}>
                            {h.type === 'national' ? 'Nasional' : 'Perusahaan'}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#64748b' }}>{h.is_recurring ? 'YA' : 'TIDAK'}</span>
                        </td>
                        <td className="td-center">
                          <span className="badge-soft badge-soft--green">ACTIVE</span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => navigate(`/workforce/holidays/edit/${h.id}`)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-delete"
                              onClick={() => setDeleteTarget(h)}
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
                  {filteredHolidays.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredHolidays.length)} dari ${filteredHolidays.length} data`}
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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Hari Libur"
        message={`Hari libur "${String(deleteTarget?.name || "ini")}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default HolidayCalendarPage;
