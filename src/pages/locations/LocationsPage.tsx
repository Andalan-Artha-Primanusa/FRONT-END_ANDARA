import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, ConfirmDialog, PageHeader } from '@/shared/ui';
import { Button } from '@/shared/ui/Button';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { getLocationsPage, deleteLocation } from '@/features/location/api/location.service';
import type { LocationItem } from '@/features/location/types/location.types';
import { MapPinned, Pencil, Plus, RefreshCw, Trash2, MapPin, Search, Filter } from 'lucide-react';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './LocationsPage.css';

const LocationsPage = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LocationItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter State
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalLocations, setTotalLocations] = useState(0);

  // Extract unique departments for filter
  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(locations.map((loc) => loc.department).filter(Boolean))).sort();
  }, [locations]);

  // Backend handles pagination; lightweight local filtering only reflects the loaded page.
  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      const searchStr = searchText.toLowerCase();
      const nameMatch = location.name?.toLowerCase().includes(searchStr);
      const idMatch = String(location.id).includes(searchStr);
      const textMatch = !searchText || nameMatch || idMatch;

      const deptMatch = !selectedDepartment || location.department === selectedDepartment;

      return textMatch && deptMatch;
    });
  }, [locations, searchText, selectedDepartment]);

  const paginatedLocations = filteredLocations;

  const [totalPages, setTotalPages] = useState(1);

  const withCoordinateCount = locations.filter((location) => {
    const lat = parseFloat(String((location as any).latitude || 0));
    const lng = parseFloat(String((location as any).longitude || 0));
    return lat !== 0 && lng !== 0;
  }).length;

  const locationSummaryCards = useMemo(
    () => [
      {
        label: 'Total Lokasi',
        subtitle: 'Semua lokasi terdaftar',
        value: String(totalLocations),
        change: 'Data lokasi aktif',
        tone: 'blue' as const,
        icon: MapPinned,
      },
      {
        label: 'Hasil Filter',
        subtitle: 'Lokasi sesuai pencarian',
        value: String(filteredLocations.length),
        change: `${paginatedLocations.length} data per halaman`,
        tone: 'green' as const,
        icon: Search,
      },
      {
        label: 'Dengan Koordinat',
        subtitle: 'Latitude dan longitude valid',
        value: String(withCoordinateCount),
        change: 'Lokasi siap absensi',
        tone: 'orange' as const,
        icon: MapPin,
      },
    ],
    [totalLocations, filteredLocations.length, paginatedLocations.length, withCoordinateCount]
  );

  const clearFilters = () => {
    setSearchText('');
    setSelectedDepartment('');
    setCurrentPage(1);
  };

  const loadLocations = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const params: Record<string, string> = {};
      if (searchText.trim()) params.search = searchText.trim();
      const result = await getLocationsPage(currentPage, pageSize, params);
      setLocations(result.items);
      setTotalPages(result.totalPages);
      setTotalLocations(result.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat locations';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteLocation(String((deleteTarget as any).id));
      await loadLocations();
      setErrorMessage(null);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus location';
      setErrorMessage(message);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    void loadLocations();
  }, [currentPage, pageSize, searchText]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedDepartment]);

  return (
    <div className="crud-page locations-page">
      {/* Header */}
      <PageHeader
        title="Daftar Lokasi"
        subtitle="Kelola lokasi absensi dan radius untuk setiap tempat kerja."
        badge={{ icon: MapPinned, label: "Location Center" }}
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadLocations()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Memuat...' : 'Segarkan'}
            </button>
            <button className="btn-primary" onClick={() => navigate('/locations/create')} disabled={loading}>
              <Plus size={16} />
              Buat Lokasi Baru
            </button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {locationSummaryCards.map((card) => {
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
        <CardHeader
          icon={MapPinned}
          title="Daftar Lokasi"
          subtitle="Kelola dan lihat semua lokasi"
          iconColor="var(--color-primary-dark)"
          iconBgColor="var(--color-primary-light)"
        />
      </Card>

      {/* Table Section with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Cari lokasi..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
            <button className={`filter-btn-rounded ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-dropdown">
            <div className="filter-row">
              <div className="filter-group">
                <label>Departemen</label>
                <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="filter-select-premium">
                  <option value="">Semua Departemen</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              {(searchText || selectedDepartment) && (
                <button className="btn-clear-filter" onClick={clearFilters}>
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

          {loading && <LoadingState message="Memuat lokasi..." />}

          {!loading && errorMessage && (
            <div className="error-state-container">
              <div className="error-state">
                <p className="error-state-title">Koneksi Terputus</p>
                <p className="error-state-message">{errorMessage}</p>
                <button className="btn-primary" onClick={() => void loadLocations()}>
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          {!loading && !errorMessage && paginatedLocations.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Lokasi Kosong"
                message={searchText || selectedDepartment ? 'Tidak ada lokasi yang sesuai dengan kriteria Anda.' : 'Belum ada lokasi. Buat lokasi baru untuk memulai.'}
                actionLabel="Buat Lokasi Baru"
                actionVariant="success"
                actionClassName="locations-empty-action"
                actionPlainButton
                actionStyle={{
                  backgroundColor: '#0A7A3E',
                  color: '#FFFFFF',
                  borderColor: '#0A7A3E',
                  opacity: 1,
                }}
                onAction={() => navigate('/locations/create')}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedLocations.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '400px' }}>Nama Lokasi</th>
                      <th>Project ID</th>
                      <th>Kode Lokasi</th>
                      <th>Departemen</th>
                      <th>Latitude</th>
                      <th>Longitude</th>
                      <th>Radius</th>
                      <th className="th-center" style={{ width: '120px' }}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLocations.map((location, idx) => {
                      const loc = location as any;
                      return (
                        <tr key={String(loc.id ?? idx)}>
                          <td>
                            <div className="cell-name">
                              <div className="cell-avatar">
                                {loc.name ? loc.name.charAt(0).toUpperCase() : <MapPin size={14} />}
                              </div>
                              <div className="cell-stacked">
                                <span className="cell-name-text">{loc.name || 'N/A'}</span>
                                <span className="cell-stacked__sub">{loc.id}</span>
                              </div>
                            </div>
                          </td>
                          <td>{String(loc.project_id || '-')}</td>
                          <td>{String(loc.location_code || '-')}</td>
                          <td>
                            <span className="badge-soft badge-soft--blue">{String(loc.department || 'All Departments')}</span>
                          </td>
                          <td>{parseFloat(String(loc.latitude || 0)).toFixed(6)}</td>
                          <td>{parseFloat(String(loc.longitude || 0)).toFixed(6)}</td>
                          <td>
                            <span className="badge-soft badge-soft--orange">{String(loc.radius || 0)}m</span>
                          </td>
                          <td className="td-center">
                            <div className="action-btn-group">
                              <button className="action-btn action-btn-edit" onClick={() => navigate(`/locations/edit/${loc.id}`)} title="Edit">
                                <Pencil size={16} />
                              </button>
                              <button className="action-btn action-btn-delete" onClick={() => setDeleteTarget(location)} title="Hapus">
                                <Trash2 size={16} />
                              </button>
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
                  {filteredLocations.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredLocations.length)} dari ${filteredLocations.length} data`}
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
        title="Hapus Lokasi"
        message={`Lokasi "${String((deleteTarget as any)?.name || "ini")}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default LocationsPage;
