import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/app/store/auth.store";
import { Card } from "@/shared/ui/Card";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { PageHeader } from "@/shared/ui";
import { showToast } from '@/shared/ui/toast';
import { LoadingState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { KeyRound, RefreshCw, Shield, Plus, Search, Filter, Edit, Trash2 } from "lucide-react";
import { deleteRole, getAllRoles } from "@/features/admin/api/admin.service";
import { getErrorMessage } from "@/shared/api/errorHandler";
import { RBACUtils } from "@/shared/hooks/rbac";
import { ROLES } from "@/shared/types/rbac.types";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./AdminRolesPage.css";

interface Role {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  permissions_count?: number;
}

const AdminRolesPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canViewRoles = RBACUtils.canViewRoles(user);
  const canCreateRoles = RBACUtils.canCreateRoles(user);
  const canUpdateRoles = RBACUtils.canUpdateRoles(user);
  const canDeleteRoles = RBACUtils.canDeleteRoles(user);

  const [roles, setRoles] = useState<Role[]>([]);
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const loadRoles = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getAllRoles(currentPage, pageSize);
      const rolesArray = Array.isArray(data) ? data : (data as any).items || (data as any).data || [];
      setRoles(rolesArray);
      setTotalPages((data as any)?.totalPages ?? 1);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error as never));
    } finally {
      setLoading(false);
    }
  };

  // Filter & Paginate Logic
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const searchStr = searchText.toLowerCase();
      if (searchStr) {
        const nameMatch = r.name?.toLowerCase().includes(searchStr);
        const displayMatch = r.display_name?.toLowerCase().includes(searchStr);
        if (!nameMatch && !displayMatch) return false;
      }

      return true;
    });
  }, [roles, searchText]);

  const paginatedRoles = filteredRoles;

  const [totalPages, setTotalPages] = useState(1);

  const rolesSummaryCards = useMemo(
    () => [
      {
        label: "Total Peran",
        subtitle: "Semua role tersedia",
        value: String(roles.length),
        change: "Data role sistem",
        tone: "blue" as const,
        icon: Shield,
      },
      {
        label: "Hasil Filter",
        subtitle: "Role sesuai pencarian",
        value: String(filteredRoles.length),
        change: `${paginatedRoles.length} data per halaman`,
        tone: "green" as const,
        icon: Search,
      },
      {
        label: "Total Izin",
        subtitle: "Jumlah permission aktif",
        value: String(roles.reduce((sum, r) => sum + (r.permissions_count || 0), 0)),
        change: "Hak akses sistem",
        tone: "orange" as const,
        icon: KeyRound,
      },
    ],
    [roles.length, filteredRoles.length, paginatedRoles.length]
  );

  const clearFilters = () => {
    setSearchText("");
    setCurrentPage(1);
  };

  const requestDelete = (role: Role) => {
    if (role.name === ROLES.SUPER_ADMIN) {
      showToast("Peran Super Admin tidak dapat dihapus.", "error");
      return;
    }

    setDeleteTarget(role);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteRole(deleteTarget.id);
      showToast(`Peran "${deleteTarget.name}" berhasil dihapus.`, "success");
      setDeleteTarget(null);
      void loadRoles();
    } catch (error: unknown) {
      showToast(getErrorMessage(error as never), "error");
    } finally {
      setDeleting(false);
    }
  };

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  useEffect(() => {
    void loadRoles();
  }, [currentPage]);

  if (!canViewRoles) {
    return (
      <div className="crud-page">
        <PageHeader
          title="Akses Ditolak"
          subtitle="Anda tidak memiliki izin untuk mengakses halaman ini."
          badge={{ icon: Shield, label: "Admin Center" }}
        />
        <div className="">
          <Card glass style={{ padding: "2rem", textAlign: "center" }}>
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
        title="Kelola Peran"
        subtitle="Manajemen role dan permission pengguna sistem."
        badge={{ icon: Shield, label: "Admin Center" }}
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadRoles()} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Memuat..." : "Segarkan"}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/admin/roles/create")}
              disabled={!canCreateRoles}
            >
              <Plus size={16} />
              Tambah Peran
            </button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {rolesSummaryCards.map((card) => {
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
            <Shield size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Peran</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua role</p>
          </div>
        </div>
      </Card>

      {/* Table Section with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="control-actions">
            <button className={`filter-btn-rounded ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(!showFilters)}>
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
                placeholder="Cari role..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
          </div>
        </div>

        {/* Filter Panel - can be extended for role-specific filters */}
        {showFilters && (
          <div className="filter-dropdown">
            <div className="filter-row">
              {(searchText) && (
                <button className="btn-clear-filter" onClick={clearFilters}>
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

          {loading && <LoadingState message="Memuat roles..." />}

          {!loading && errorMessage && (
            <div className="error-state-container">
              <div className="error-state">
                <p className="error-state-title">Koneksi Terputus</p>
                <p className="error-state-message">{errorMessage}</p>
                <button className="btn-primary" onClick={() => void loadRoles()}>
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          {!loading && !errorMessage && paginatedRoles.length === 0 && (
            <div style={{ padding: "5rem 0" }}>
              <EmptyState
                title="Peran Kosong"
                message={searchText ? "Tidak ada role yang sesuai dengan kriteria Anda." : "Belum ada data role. Tambah role baru untuk memulai."}
                actionLabel="Tambah Peran"
                onAction={() => navigate("/admin/roles/create")}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedRoles.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "400px" }}>Nama Peran</th>
                      <th>Deskripsi</th>
                      <th>Izin</th>
                      <th className="th-center" style={{ width: "120px" }}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRoles.map((role) => (
                      <tr key={role.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {role.name?.charAt(0).toUpperCase() || "R"}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{role.name}</span>
                              <span className="cell-stacked__sub">{String(role.id)}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "#475569", fontWeight: 500, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{role.description || "-"}</td>
                        <td>
                          <span className={`badge-soft ${role.permissions_count ? "badge-soft--green" : "badge-soft--orange"}`}>
                            {role.permissions_count || 0} permissions
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            {canUpdateRoles && (
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => navigate(`/admin/roles/edit/${role.id}`)}
                              title="Ubah Peran"
                            >
                              <Edit size={16} />
                            </button>
                            )}
                            {canDeleteRoles && (
                            <button
                              className="action-btn action-btn-delete"
                              onClick={() => requestDelete(role)}
                              title="Hapus Peran"
                              disabled={role.name === ROLES.SUPER_ADMIN}
                            >
                              <Trash2 size={16} />
                            </button>
                            )}
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
                  {filteredRoles.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredRoles.length)} dari ${filteredRoles.length} data`}
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
                      className={`pagination-btn ${currentPage === page ? "active" : ""}`}
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
        title="Hapus Peran"
        message={`Peran "${deleteTarget?.name || ""}" akan dihapus. Pastikan peran ini tidak sedang dipakai oleh pengguna aktif.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminRolesPage;
