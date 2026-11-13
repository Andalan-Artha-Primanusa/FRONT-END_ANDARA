import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/app/store/auth.store";
import { Card, Modal, Button } from "@/shared/ui";
import { LoadingState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { PageHeader } from "@/shared/ui";
import { RBACUtils } from "@/shared/hooks/rbac";
import { getAllPermissions, getPermissionById } from "@/features/admin/api/admin.service";
import { getErrorMessage } from "@/shared/api/errorHandler";
import type { AdminEntityItem } from "@/features/admin/types/admin.types";
import { KeyRound, RefreshCw, Search, Shield, Filter } from "lucide-react";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./AdminPermissionsPage.css";

const AdminPermissionsPage = () => {
  const user = useAuthStore((state) => state.user);
  const canViewPermissions = RBACUtils.canViewPermissions(user);

  const [permissions, setPermissions] = useState<AdminEntityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPermissions, setTotalPermissions] = useState(0);
  const [selectedPermission, setSelectedPermission] = useState<AdminEntityItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Extract unique guard names for filter
  const uniqueGuards = useMemo(() => {
    const guards = new Set<string>();
    permissions.forEach((p) => {
      if (p.guard_name) guards.add(String(p.guard_name));
    });
    return Array.from(guards).sort();
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter((item) => {
      const searchStr = searchText.toLowerCase();
      if (searchStr) {
        const nameMatch = String(item.name || '').toLowerCase().includes(searchStr);
        const guardMatch = String(item.guard_name || '').toLowerCase().includes(searchStr);
        if (!nameMatch && !guardMatch) return false;
      }

      if (selectedGuard) {
        if (item.guard_name !== selectedGuard) return false;
      }

      return true;
    });
  }, [permissions, searchText, selectedGuard]);

  const paginatedPermissions = filteredPermissions;

  const permissionSummaryCards = useMemo(
    () => [
      {
        label: "Total Izin",
        subtitle: "Semua permission tersedia",
        value: String(totalPermissions),
        change: "Data permission sistem",
        tone: "blue" as const,
        icon: KeyRound,
      },
      {
        label: "Hasil Filter",
        subtitle: "Izin sesuai pencarian",
        value: String(filteredPermissions.length),
        change: `${paginatedPermissions.length} data per halaman`,
        tone: "green" as const,
        icon: Search,
      },
      {
        label: "Jenis Guard",
        subtitle: "Jenis penjaga akses yang digunakan",
        value: String(uniqueGuards.length),
        change: "Hak akses sistem",
        tone: "orange" as const,
        icon: Shield,
      },
    ],
    [totalPermissions, filteredPermissions.length, paginatedPermissions.length, uniqueGuards.length]
  );

  const clearFilters = () => {
    setSearchText("");
    setSelectedGuard("");
    setCurrentPage(1);
  };

  const loadPermissions = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getAllPermissions(currentPage, pageSize);
      setPermissions(data.items.map((item) => ({ ...item })));
      setTotalPages(data.totalPages);
      setTotalPermissions(data.total);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error as never));
    } finally {
      setLoading(false);
    }
  };

  const openPermissionDetail = async (permission: AdminEntityItem) => {
    setSelectedPermission(permission);
    setDetailError(null);

    const permissionId = permission.id;
    if (!permissionId) return;

    setDetailLoading(true);
    try {
      const result = await getPermissionById(permissionId as string | number);
      const detail = result.data && typeof result.data === "object"
        ? (result.data as AdminEntityItem)
        : permission;
      setSelectedPermission({ ...permission, ...detail });
    } catch (error: unknown) {
      setDetailError(getErrorMessage(error as never));
    } finally {
      setDetailLoading(false);
    }
  };

  const closePermissionDetail = () => {
    setSelectedPermission(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const extraPermissionEntries = useMemo(() => {
    if (!selectedPermission) return [];

    const hiddenKeys = new Set(["id", "name", "guard_name", "created_at", "updated_at"]);
    return Object.entries(selectedPermission)
      .filter(([key, value]) => !hiddenKeys.has(key) && value !== null && value !== undefined && value !== "")
      .map(([key, value]) => [
        key,
        typeof value === "object" ? JSON.stringify(value, null, 2) : String(value),
      ]);
  }, [selectedPermission]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedGuard]);

  useEffect(() => {
    void loadPermissions();
  }, [currentPage, pageSize]);

  if (!canViewPermissions) {
    return (
      <div className="crud-page">
        <PageHeader
          title="Akses Ditolak"
          subtitle="Anda tidak memiliki izin untuk mengakses halaman ini."
          badge={{ icon: Shield, label: "Admin Center" }}
        />
        <div className="">
          <Card glass style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Silakan hubungi Administrator untuk mendapatkan akses.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title="Manajemen Izin"
        subtitle="Kelola dan tampilkan daftar permission yang tersedia untuk pengaturan akses sistem."
        badge={{ icon: Shield, label: "Admin Center" }}
        actions={
          <button className="btn-outline" onClick={() => void loadPermissions()} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Memuat..." : "Segarkan"}
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {permissionSummaryCards.map((card) => {
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
            <KeyRound size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Izin</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua permission</p>
          </div>
        </div>
      </Card>

      {/* Table Section with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="control-actions">
            <button
              className={`filter-btn-rounded ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>

          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Cari permission..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-dropdown">
            <div className="filter-row">
              <div className="filter-group">
                <label>Penjaga Akses</label>
                <select
                  value={selectedGuard}
                  onChange={(e) => setSelectedGuard(e.target.value)}
                  className="filter-select-premium"
                >
                  <option value="">Semua Penjaga Akses</option>
                  {uniqueGuards.map((guard) => (
                    <option key={guard} value={guard}>
                      {guard}
                    </option>
                  ))}
                </select>
              </div>
              {(searchText || selectedGuard) && (
                <button className="btn-clear-filter" onClick={clearFilters}>
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

          {loading && <LoadingState message="Memuat permissions..." />}

          {!loading && errorMessage && (
            <div className="error-state-container">
              <div className="error-state">
                <p className="error-state-title">Koneksi Terputus</p>
                <p className="error-state-message">{errorMessage}</p>
                <button className="btn-primary" onClick={() => void loadPermissions()}>
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          {!loading && !errorMessage && paginatedPermissions.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Izin Kosong"
                message={searchText || selectedGuard ? 'Tidak ada izin yang sesuai dengan kriteria Anda.' : 'Belum ada data izin.'}
                actionLabel="Segarkan"
                onAction={() => void loadPermissions()}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedPermissions.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '400px' }}>Izin</th>
                      <th>Penjaga Akses</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPermissions.map((item, index) => (
                      <tr key={String(item.id ?? index)}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {String(item.name || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{String(item.name)}</span>
                              <span className="cell-stacked__sub">{String(item.id)}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge-soft badge-soft--blue">{String(item.guard_name || '-')}</span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn action-btn-edit"
                              title="Lihat Detail"
                              onClick={() => void openPermissionDetail(item)}
                            >
                              <KeyRound size={16} />
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
                  {filteredPermissions.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredPermissions.length)} dari ${filteredPermissions.length} data`}
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
        isOpen={Boolean(selectedPermission)}
        onClose={closePermissionDetail}
        title="Detail Izin"
        size="md"
        footer={
          <Button variant="secondary" onClick={closePermissionDetail}>
            Tutup
          </Button>
        }
      >
        {selectedPermission && (
          <div className="permission-detail">
            <div className="permission-detail__header">
              <div className="permission-detail__icon">
                <KeyRound size={22} />
              </div>
              <div>
                <p className="permission-detail__label">Permission</p>
                <h3>{String(selectedPermission.name || "-")}</h3>
              </div>
            </div>

            {detailLoading && (
              <div className="permission-detail__notice">Memuat detail izin...</div>
            )}

            {detailError && (
              <div className="permission-detail__notice permission-detail__notice--error">
                Detail terbaru tidak dapat dimuat. Menampilkan data dari tabel. {detailError}
              </div>
            )}

            <div className="permission-detail__grid">
              <div className="permission-detail__item">
                <span>ID</span>
                <strong>{String(selectedPermission.id || "-")}</strong>
              </div>
              <div className="permission-detail__item">
                <span>Penjaga Akses</span>
                <strong>{String(selectedPermission.guard_name || "-")}</strong>
              </div>
              <div className="permission-detail__item">
                <span>Dibuat</span>
                <strong>{String(selectedPermission.created_at || "-")}</strong>
              </div>
              <div className="permission-detail__item">
                <span>Diperbarui</span>
                <strong>{String(selectedPermission.updated_at || "-")}</strong>
              </div>
            </div>

            {extraPermissionEntries.length > 0 && (
              <div className="permission-detail__extra">
                <p>Informasi Tambahan</p>
                {extraPermissionEntries.map(([key, value]) => (
                  <div className="permission-detail__extra-row" key={key}>
                    <span>{key}</span>
                    <code>{value}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPermissionsPage;
