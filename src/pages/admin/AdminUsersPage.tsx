import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/app/store/auth.store";
import { Card, CardHeader } from "@/shared/ui";
import { LoadingState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { PageHeader } from "@/shared/ui";
import { getAllUsers } from "@/features/admin/api/admin.service";
import { getErrorMessage } from "@/shared/api/errorHandler";
import { RBACUtils } from "@/shared/hooks/rbac";
import { ROLES } from "@/shared/types/rbac.types";
import CompanyScopeBadge from "@/shared/components/CompanyScopeBadge";
import { RefreshCw, Search, UserPlus, Users, Shield, Filter } from "lucide-react";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./AdminUsersPage.css";

interface UserRoleInfo {
  name: string;
  display_name: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  roles: UserRoleInfo[];
}

const getInitial = (value?: string | null) => (value?.trim().charAt(0) || "U").toUpperCase();

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canViewUsers = RBACUtils.canViewUsers(user);
  const canCreateUsers = RBACUtils.canCreateUsers(user);
  const canAssignRoles = RBACUtils.canAssignRoles(user);

  const roleToneClass = (role: UserRoleInfo) => {
    if (role.name === ROLES.SUPER_ADMIN) return "badge-soft badge-soft--red";
    return "badge-soft badge-soft--green";
  };

  if (!canViewUsers) {
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

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const loadUsers = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await getAllUsers(currentPage, pageSize);
      const formattedUsers = (result.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        roles: Array.isArray(item.roles)
          ? item.roles.map((r: any) => ({
              name: r.name || '',
              display_name: r.display_name || r.name || '',
            }))
          : [],
      }));
      setUsers(formattedUsers);
      setTotalPages(result.totalPages ?? 1);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error as any));
    } finally {
      setLoading(false);
    }
  };

  // Extract unique roles for filter
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    users.forEach((u) => {
      u.roles?.forEach((role) => roles.add(role.display_name));
    });
    return Array.from(roles).sort();
  }, [users]);

  // Filter & Paginate Logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const searchStr = searchText.toLowerCase();
      if (searchStr) {
        const nameMatch = u.name?.toLowerCase().includes(searchStr);
        const emailMatch = u.email?.toLowerCase().includes(searchStr);
        if (!nameMatch && !emailMatch) return false;
      }

      if (selectedRole) {
        if (!u.roles?.some((role) => role.display_name === selectedRole)) return false;
      }

      return true;
    });
  }, [users, searchText, selectedRole]);

  const paginatedUsers = filteredUsers;

  const [totalPages, setTotalPages] = useState(1);

  const userSummaryCards = useMemo(
    () => [
      {
        label: 'Total Users',
        subtitle: 'Semua pengguna terdaftar',
        value: String(users.length),
        change: 'Data user aktif',
        tone: 'blue' as const,
        icon: Users,
      },
      {
        label: 'Hasil Filter',
        subtitle: 'User sesuai pencarian',
        value: String(filteredUsers.length),
        change: `${paginatedUsers.length} data per halaman`,
        tone: 'green' as const,
        icon: Search,
      },
      {
        label: 'Total Peran',
        subtitle: 'Jenis role tersedia',
        value: String(uniqueRoles.length),
        change: 'Hak akses sistem',
        tone: 'orange' as const,
        icon: Shield,
      },
    ],
    [users.length, filteredUsers.length, paginatedUsers.length, uniqueRoles.length]
  );

  const clearFilters = () => {
    setSearchText('');
    setSelectedRole('');
    setCurrentPage(1);
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedRole]);

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title="Daftar Pengguna"
        subtitle="Kelola dan tampilkan daftar pengguna beserta role mereka."
        badge={{ icon: Shield, label: "Admin Center" }}
        scope
        actions={
          <>
            <button
              className="btn-outline"
              onClick={() => void loadUsers()}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Memuat..." : "Segarkan"}
            </button>
            <button
              className="btn-outline"
              onClick={() => navigate("/admin/users/create")}
              disabled={!canCreateUsers}
            >
              <UserPlus size={16} />
              Buat Akun
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate("/admin/users/assign-roles")}
              disabled={!canAssignRoles}
            >
              <Shield size={16} />
              Tetapkan Peran
            </button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {userSummaryCards.map((card) => {
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
            <Users size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Pengguna</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua pengguna</p>
          </div>
        </div>
      </Card>

      {/* Table Section with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="control-actions">
            <button className={`filter-btn-rounded ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
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
                placeholder="Cari pengguna..."
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
                <label>Peran</label>
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="filter-select-premium">
                  <option value="">Semua Peran</option>
                  {uniqueRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              {(searchText || selectedRole) && (
                <button className="btn-clear-filter" onClick={clearFilters}>
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

          {loading && <LoadingState message="Memuat users..." />}

          {!loading && errorMessage && (
            <div className="error-state-container">
              <div className="error-state">
                <p className="error-state-title">Koneksi Terputus</p>
                <p className="error-state-message">{errorMessage}</p>
                <button className="btn-primary" onClick={() => void loadUsers()}>
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          {!loading && !errorMessage && paginatedUsers.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pengguna Kosong"
                message={searchText || selectedRole ? 'Tidak ada pengguna yang sesuai dengan kriteria Anda.' : 'Belum ada pengguna terdaftar.'}
                actionLabel="Segarkan"
                onAction={() => void loadUsers()}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedUsers.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '400px' }}>Nama Pengguna</th>
                      <th>Email</th>
                      <th>Peran</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">{getInitial(u.name)}</div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{u.name}</span>
                              <span className="cell-stacked__sub">{u.id}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#475569', fontWeight: 500 }}>{u.email}</td>
                        <td>
                          {u.roles && u.roles.length > 0 ? (
                            <div className="admin-users-role-list">
                              {u.roles.map((role, idx) => (
                                <span
                                  key={idx}
                                  className={roleToneClass(role)}
                                >
                                  {role.display_name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>-</span>
                          )}
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            {canAssignRoles && (
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => navigate("/admin/users/assign-roles")}
                              title="Tetapkan Peran"
                            >
                              <Shield size={16} />
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
                  {filteredUsers.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredUsers.length)} dari ${filteredUsers.length} data`}
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

export default AdminUsersPage;
