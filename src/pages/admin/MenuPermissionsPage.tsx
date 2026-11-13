import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, PageHeader } from "@/shared/ui";
import { LoadingState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { api } from "@/shared/api/httpClient";
import { showToast } from "@/shared/ui/toast";
import { clearMenuCache } from "@/shared/config/menuFilter";
import { Shield, Search, Loader2, CheckSquare, Users, LayoutDashboard, Info } from "lucide-react";
import { ROLES, PERMISSIONS } from "@/shared/types/rbac.types";
import { RBACUtils } from "@/shared/hooks/rbac";
import { useAuthStore } from "@/app/store/auth.store";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "@/pages/employee/EmployeesPage.css";
import "./MenuPermissionsPage.css";

type Role = {
  id: number;
  name: string;
};

type MenuDef = {
  key: string;
  label: string;
  path?: string;
  assigned_role_ids: number[];
};

const MenuPermissionsPage = () => {
  const user = useAuthStore((s) => s.user);
  const [menuItems, setMenuItems] = useState<MenuDef[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/menus");
      const items = res.data?.data?.items ?? [];
      const rls = res.data?.data?.roles ?? [];
      setMenuItems(items);
      setRoles(rls);
    } catch {
      showToast("Gagal memuat data menu", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (menuKey: string, roleId: number, currentlyAssigned: boolean) => {
    if (!RBACUtils.hasPermission(user, PERMISSIONS.ROLE_ASSIGN_PERMISSION)) {
      showToast("Anda tidak memiliki izin untuk mengubah akses menu", "error");
      return;
    }
    setSaving(menuKey);
    try {
      if (currentlyAssigned) {
        await api.delete(`/admin/menus/${menuKey}/roles/${roleId}`, { skipToast: true } as any);
      } else {
        await api.post("/admin/menus/assign-role", { menu_key: menuKey, role_id: roleId }, { skipToast: true } as any);
      }
      setMenuItems((prev) =>
        prev.map((m) =>
          m.key === menuKey
            ? {
                ...m,
                assigned_role_ids: currentlyAssigned
                  ? m.assigned_role_ids.filter((id) => id !== roleId)
                  : [...m.assigned_role_ids, roleId],
              }
            : m
        )
      );
      clearMenuCache();
      window.dispatchEvent(new CustomEvent('menu-cache-cleared'));
      showToast(
        `Akses menu "${menuItems.find(m => m.key === menuKey)?.label || menuKey}" berhasil diperbarui`,
        "success"
      );
    } catch {
      showToast("Gagal memperbarui akses menu", "error");
    } finally {
      setSaving(null);
    }
  };

  const totalAssignments = useMemo(() => {
    return menuItems.reduce((sum, m) => sum + m.assigned_role_ids.length, 0);
  }, [menuItems]);

  const totalUnassigned = useMemo(() => {
    if (!roles.length) return 0;
    return menuItems.filter((m) => m.assigned_role_ids.length === 0).length;
  }, [menuItems, roles]);

  const filteredItems = useMemo(() => {
    if (!searchText) return menuItems;
    const q = searchText.toLowerCase();
    return menuItems.filter(
      (m) => m.label.toLowerCase().includes(q) || m.key.toLowerCase().includes(q)
    );
  }, [menuItems, searchText]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredItems.length / pageSize));
  }, [filteredItems.length, pageSize]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  const summaryCards = [
    {
      label: "Total Menu",
      subtitle: "Seluruh menu dalam sistem",
      value: String(menuItems.length),
      change: `${filteredItems.length} setelah difilter`,
      tone: "blue" as const,
      icon: LayoutDashboard,
    },
    {
      label: "Total Role",
      subtitle: "Role yang dapat diatur",
      value: String(roles.length),
      change: "Kecuali Super Admin",
      tone: "purple" as const,
      icon: Users,
    },
    {
      label: "Total Assignment",
      subtitle: "Akses yang telah diberikan",
      value: String(totalAssignments),
      change: `${roles.length ? Math.round(totalAssignments / (menuItems.length || 1) * 10) / 10 : 0} per menu rata-rata`,
      tone: "green" as const,
      icon: CheckSquare,
    },
    {
      label: "Belum Diatur",
      subtitle: "Menu tanpa pembatasan",
      value: String(totalUnassigned),
      change: "Dapat diakses semua user",
      tone: "orange" as const,
      icon: Info,
    },
  ];

  if (loading) return <LoadingState message="Memuat data menu..." />;

  return (
    <div className="crud-page">
      <PageHeader
        title="Menu Permissions"
        subtitle="Manage role-based access for every menu in the system."
        badge={{ icon: Shield, label: "Access Control" }}
        actions={
          <button className="btn-outline" onClick={() => void loadData()} disabled={loading}>
            Refresh
          </button>
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
            <Shield size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Menu & Role</h2>
            <p className="analytics-subtitle">Kelola akses menu berdasarkan role pengguna</p>
          </div>
        </div>
      </Card>

      {/* Control Section */}
      <Card className="control-section-card">
        <div className="control-section-inner">
          <div className="control-actions" style={{ width: "100%" }}>
            <div className="search-box" style={{ minWidth: "100%" }}>
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari menu berdasarkan nama atau key..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <div className="table-section">
        <div className="wuw-table-area">
          {filteredItems.length === 0 ? (
            <div style={{ padding: "5rem 0" }}>
              <EmptyState
                title="Menu Tidak Ditemukan"
                message={searchText ? "Tidak ada menu yang sesuai dengan pencarian Anda." : "Belum ada data menu."}
                actionLabel="Reset Pencarian"
                onAction={() => setSearchText("")}
              />
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 280 }}>Menu</th>
                      <th>Path</th>
                      {roles.map((role) => (
                        <th key={role.id} className="th-center" style={{ minWidth: 100 }}>
                          {role.name === ROLES.SUPER_ADMIN
                            ? "Super Admin"
                            : role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => (
                      <tr key={item.key}>
                        <td>
                          <div className="cell-stacked">
                            <span className="cell-name-text">{item.label}</span>
                            <span className="cell-stacked__sub">{item.key}</span>
                          </div>
                        </td>
                        <td>
                          <code style={{ fontSize: "0.8rem", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                            {item.path || "-"}
                          </code>
                        </td>
                        {roles.map((role) => {
                          const assigned = item.assigned_role_ids.includes(role.id);
                          const isSaving = saving === item.key;
                          return (
                            <td key={role.id} className="td-center">
                              {isSaving ? (
                                <Loader2 size={16} className="animate-spin" style={{ margin: "0 auto" }} />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={assigned}
                                  onChange={() => toggleRole(item.key, role.id, assigned)}
                                  className="menu-role-checkbox"
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="table-pagination">
                <div className="pagination-info">
                  Menampilkan <strong>{filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong>-
                  <strong>{Math.min(currentPage * pageSize, filteredItems.length)}</strong> dari <strong>{filteredItems.length}</strong> menu
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
    </div>
  );
};

export default MenuPermissionsPage;
