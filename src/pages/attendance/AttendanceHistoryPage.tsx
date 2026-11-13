import { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, PageHeader } from '@/shared/ui';
import { Button } from '@/shared/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { attendanceService } from '@/features/attendance/api/attendance.service';
import { CalendarDays, CheckCircle2, Clock, RefreshCw, XCircle, Search } from 'lucide-react';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';

interface AttendanceRecord {
  date?: string;
  check_in?: string;
  check_out?: string;
  status?: string;
  [key: string]: any;
}

const AttendanceHistoryPage = () => {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'Semua' | 'Hadir' | 'Absen' | 'Terlambat'>('Semua');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const loadHistory = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await attendanceService.getHistory(currentPage, pageSize);
      console.log('Attendance history response:', result);
      setHistory(result.items);
      setTotalPages(result.totalPages);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Terjadi kesalahan';
      console.error('Attendance history error:', error);
      setErrorMessage(message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [currentPage, pageSize]);

  // Filter & Sort & Paginate
  const filteredHistory = useMemo(() => {
    return history.filter((record) => {
      const searchStr = searchText.toLowerCase();
      const dateMatch = record.date?.toLowerCase().includes(searchStr) || false;
      const statusMatch = record.status?.toLowerCase().includes(searchStr) || false;
      const textMatch = dateMatch || statusMatch;

      let tabMatch = true;
      if (activeTab === 'Hadir') tabMatch = record.status?.toLowerCase().includes('present') || record.status?.toLowerCase().includes('hadir') || false;
      else if (activeTab === 'Absen') tabMatch = record.status?.toLowerCase().includes('absent') || record.status?.toLowerCase().includes('tidak') || false;
      else if (activeTab === 'Terlambat') tabMatch = record.status?.toLowerCase().includes('late') || record.status?.toLowerCase().includes('terlambat') || false;

      return textMatch && tabMatch;
    });
  }, [history, searchText, activeTab]);

  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      const dateA = new Date(a.date || '').getTime();
      const dateB = new Date(b.date || '').getTime();
      return dateB - dateA; // Newest first
    });
  }, [filteredHistory]);

  const paginatedHistory = sortedHistory;

  const clearFilters = () => {
    setSearchText('');
    setActiveTab('Semua');
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const summaryStats = useMemo(() => [
    { label: "Total Records", subtitle: "Seluruh riwayat", value: String(history.length), tone: "blue" as const, icon: CalendarDays },
    { label: "Hadir", subtitle: "Kehadiran", value: String(history.filter(r => r.status?.toLowerCase().includes('present') || r.status?.toLowerCase().includes('hadir')).length), tone: "green" as const, icon: CheckCircle2 },
    { label: "Absen", subtitle: "Ketidakhadiran", value: String(history.filter(r => r.status?.toLowerCase().includes('absent') || r.status?.toLowerCase().includes('tidak')).length), tone: "red" as const, icon: XCircle },
    { label: "Terlambat", subtitle: "Keterlambatan", value: String(history.filter(r => r.status?.toLowerCase().includes('late') || r.status?.toLowerCase().includes('terlambat')).length), tone: "orange" as const, icon: Clock },
  ], [history]);

  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr) return '-';
    try {
      // Handle both ISO datetime (2026-05-07T21:37:00) and time-only (21:37) formats
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) {
        // If datetime parsing fails, try time-only format
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
      }
      // Format ISO datetime to HH:MM
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return timeStr;
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      // Handle both ISO datetime and date-only formats
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return <span className="badge-soft badge-soft--gray">N/A</span>;
    const statusLower = String(status).toLowerCase();
    if (statusLower.includes('present') || statusLower.includes('hadir')) {
      return <span className="badge-soft badge-soft--green">HADIR</span>;
    } else if (statusLower.includes('absent') || statusLower.includes('tidak')) {
      return <span className="badge-soft badge-soft--red">ABSEN</span>;
    } else if (statusLower.includes('late') || statusLower.includes('terlambat')) {
      return <span className="badge-soft badge-soft--orange">TERLAMBAT</span>;
    }
    return <span className="badge-soft badge-soft--gray">{status}</span>;
  };

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title="Riwayat Kehadiran"
        subtitle="Riwayat kehadiran Anda, termasuk check-in dan check-out setiap hari."
        badge={{ icon: CalendarDays, label: 'Kehadiran' }}
        scope
        actions={
          <button className="btn-outline" onClick={() => void loadHistory()} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Segarkan
          </button>
        }
      />

      {errorMessage && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem', color: '#b91c1c' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>×</button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryStats.map((card) => {
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
              <p className="employee-summary-trend">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <CardHeader
          icon={CalendarDays}
          title="Riwayat Kehadiran"
          subtitle="Kelola dan lihat semua riwayat kehadiran"
          iconColor="var(--color-primary-dark)"
          iconBgColor="var(--color-primary-light)"
        />
      </Card>

      {/* Table Section with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          {/* Tabs */}
          <div className="elyra-tabs">
            {(["Semua", "Hadir", "Absen", "Terlambat"] as const).map((tab) => (
              <button key={tab} className={`elyra-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
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
                placeholder="Cari tanggal atau status..."
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

          {loading && <LoadingState message="Memuat riwayat kehadiran..." />}
          {!loading && errorMessage && <ErrorState message="Koneksi Terputus" error={errorMessage} onRetry={loadHistory} />}

          {!loading && !errorMessage && paginatedHistory.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pencarian Kosong"
                message="Kami tidak menemukan riwayat yang sesuai dengan kriteria Anda."
                actionLabel="Bersihkan Filter"
                onAction={clearFilters}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedHistory.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((record, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              <CalendarDays size={14} />
                            </div>
                            <span style={{ fontWeight: 600 }}>{formatDate(record.date)}</span>
                          </div>
                        </td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>
                          {formatTime(record.check_in)}
                        </td>
                        <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          {formatTime(record.check_out)}
                        </td>
                        <td>
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="td-center">
                          <span className="badge-soft badge-soft--blue">Record</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="table-pagination">
                <div className="pagination-info">
                  {sortedHistory.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedHistory.length)} dari ${sortedHistory.length} data`}
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

export default AttendanceHistoryPage;
