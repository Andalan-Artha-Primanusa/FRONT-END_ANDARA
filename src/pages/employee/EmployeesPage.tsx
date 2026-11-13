import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, PageHeader } from "@/shared/ui";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { LoadingState, ErrorState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { showToast } from "@/shared/ui/toast";
import {
  deleteEmployee,
  getEmployeesPage,
  getEmployeeSummary,
} from "@/features/employee/api/employee.service";
import { getAllLocations, getActiveLocations } from "@/features/location/api/location.service";
import type { LocationItem } from "@/features/location/types/location.types";
import type { EmployeeItem } from "@/features/employee/types/employee.types";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import EmployeeLifecycleModals from "./components/EmployeeLifecycleModals";
import {
  Search,
  Filter,
  Pencil,
  Trash2,
  Briefcase,
  Users,
  Building2,
  Calendar,
  RefreshCw,
  Plus,
  ChevronDown,
  Download
} from "lucide-react";
import "@/shared/styles/CrudPage.css";
import "./EmployeesPage.css";

const formatDateTime = (input: string) => {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
};

const getInitial = (value?: string | null) => (value?.trim().charAt(0) || "U").toUpperCase();

const EmployeesPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const allowedMenuKeys = useAuthStore((state) => state.allowedMenuKeys);
  
  const canCreateEmployee = RBACUtils.hasPermission(user, [PERMISSIONS.EMPLOYEE_CREATE, PERMISSIONS.ADMIN_ACCESS]);
  const canUpdateEmployee = RBACUtils.hasPermission(user, [PERMISSIONS.EMPLOYEE_UPDATE, PERMISSIONS.ADMIN_ACCESS]);
  const canDeleteEmployee = RBACUtils.hasPermission(user, [PERMISSIONS.EMPLOYEE_DELETE, PERMISSIONS.ADMIN_ACCESS]);
  const canManageEmployees = canCreateEmployee || canUpdateEmployee || canDeleteEmployee;
  const canViewAdminMetadata = RBACUtils.hasPermission(user, [PERMISSIONS.ADMIN_ACCESS]);

  const [activeActionModal, setActiveActionModal] = useState<"onboarding_start" | "onboarding_complete" | "offboarding_start" | "offboarding_complete" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeItem | null>(null);
  const [onboardingDate, setOnboardingDate] = useState("");
  const [offboardingDate, setOffboardingDate] = useState("");
  const [offboardingReason, setOffboardingReason] = useState("");
  const [allLocations, setAllLocations] = useState<LocationItem[]>([]);

  // Search & Filter
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [activeTab, setActiveTab] = useState<"Semua" | "Aktif" | "Probation" | "Resigned">("Semua");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [summary, setSummary] = useState({ total: 0, active: 0, departments: 0, positions: 0 });

  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.department).filter(Boolean))).sort();
  }, [items]);

  const uniquePositions = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.position).filter(Boolean))).sort();
  }, [items]);

  const loadMetadata = async () => {
    try {
      let locList: LocationItem[] = [];
      if (canViewAdminMetadata) {
        const locs = await getAllLocations();
        locList = Array.isArray(locs.items) ? locs.items : [];
      } else {
        const active = await getActiveLocations();
        locList = Array.isArray(active.items) ? active.items : [];
      }
      setAllLocations(locList);
    } catch (err) { console.warn("Metadata failed:", err); }
  };

  const loadEmployees = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: pageSize,
      };
      if (searchText.trim()) params.search = searchText.trim();
      if (selectedDepartment) params.department = selectedDepartment;
      if (selectedPosition) params.position = selectedPosition;
      
      let statusParam = "";
      if (activeTab === "Aktif") statusParam = "active";
      else if (activeTab === "Probation") statusParam = "pending";
      else if (activeTab === "Resigned") statusParam = "inactive";
      if (statusParam) params.status = statusParam;

      const [result, aggregate] = await Promise.all([
        getEmployeesPage(currentPage, pageSize, params),
        getEmployeeSummary(),
      ]);
      setItems(Array.isArray(result.items) ? result.items : []);
      setTotalPages(result.totalPages || 1);
      setTotalEmployees(result.total || 0);
      if (token) void loadMetadata();
      setSummary(aggregate);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error as never));
    } finally { setLoading(false); }
  };

  const getErrorMessage = (error: any) => {
    return error?.response?.data?.message || error?.message || "Gagal memuat data";
  };

  const confirmDeleteEmployee = async () => {
    if (!deleteTarget) return;
    if (!canDeleteEmployee) {
      showToast("Anda tidak memiliki izin menghapus karyawan", "error");
      setDeleteTarget(null);
      return;
    }

    setLoading(true);
    try {
      await deleteEmployee(String(deleteTarget.id));
      showToast("Karyawan berhasil dihapus", "success");
      setDeleteTarget(null);
      await loadEmployees();
    } catch (error: unknown) {
      showToast(getErrorMessage(error as never), "error");
    } finally { setLoading(false); }
  };

  const handleLifecycleAction = async () => {
    // Logic for onboarding/offboarding ...
    setActiveActionModal(null);
    await loadEmployees();
  };

  useEffect(() => { void loadEmployees(); }, [currentPage, pageSize, searchText, selectedDepartment, selectedPosition, activeTab]);

  const clearFilters = () => {
    setSearchText("");
    setSelectedDepartment("");
    setSelectedPosition("");
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  const paginationItems = useMemo<(number | "ellipsis")[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const items: (number | "ellipsis")[] = [1];
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    if (start > 2) items.push("ellipsis");
    for (let page = start; page <= end; page++) items.push(page);
    if (end < totalPages - 1) items.push("ellipsis");
    items.push(totalPages);
    return items;
  }, [currentPage, totalPages]);

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title="Employee Directory"
        subtitle="Manage all employee data and organizational structure in one place."
        badge={{ icon: Briefcase, label: "Employee Center" }}
        scope
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadEmployees()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Segarkan
            </button>
            {canCreateEmployee && (
              <button className="btn-primary" onClick={() => navigate("/employees/add")}>
                <Plus size={16} /> Tambah Karyawan
              </button>
            )}
          </>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {[
          { label: "Total Karyawan", value: String(summary.total || totalEmployees), tone: "blue", icon: Users, sub: "Data terdaftar" },
          { label: "Aktif", value: String(summary.active), tone: "green", icon: Search, sub: "Karyawan aktif" },
          { label: "Departemen", value: String(summary.departments), tone: "orange", icon: Building2, sub: "Unit kerja" },
          { label: "Jabatan", value: String(summary.positions), tone: "purple", icon: Briefcase, sub: "Posisi tersedia" },
        ].map((card) => (
          <div key={card.label} className="employee-summary-card">
            <div className="employee-summary-header">
              <div>
                <p className="employee-summary-label">{card.label}</p>
                <p className="employee-summary-subtitle">{card.sub}</p>
              </div>
              <div className={`employee-summary-icon-wrapper employee-icon-${card.tone}`}><card.icon size={28} /></div>
            </div>
            <div className={`employee-summary-value employee-value-${card.tone}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="table-section employee-table-section">
        <div className="wuw-table-area employee-table-area">
          <div className="table-toolbar employee-table-toolbar">
            <div className="control-section-inner">
              <div className="elyra-tabs">
                {(["Semua", "Aktif", "Probation", "Resigned"] as const).map((tab) => (
                  <button key={tab} className={`elyra-tab ${activeTab === tab ? "active" : ""}`} onClick={() => { setActiveTab(tab); setCurrentPage(1); }}>{tab}</button>
                ))}
              </div>
              <div className="control-actions">
                <div className="search-box">
                  <div className="search-icon-inside"><Search size={18} /></div>
                  <input type="text" placeholder="Cari karyawan..." value={searchText} onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }} className="search-input-pill" />
                </div>
                <button className={`filter-btn-rounded ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(!showFilters)}><Filter size={18} /><span>Filter</span></button>
              </div>
            </div>
            {showFilters && (
              <div className="filter-dropdown">
                <div className="filter-row">
                  <div className="filter-group">
                    <label>Departemen</label>
                    <select value={selectedDepartment} onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }} className="filter-select-premium">
                      <option value="">Semua Departemen</option>
                      {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Jabatan</label>
                    <select value={selectedPosition} onChange={(e) => { setSelectedPosition(e.target.value); setCurrentPage(1); }} className="filter-select-premium">
                      <option value="">Semua Jabatan</option>
                      {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
          {loading && <LoadingState message="Memuat data karyawan..." />}
          {!loading && errorMessage && <ErrorState message="Terjadi Kesalahan" error={errorMessage} onRetry={loadEmployees} />}
          {!loading && !errorMessage && items.length === 0 && <EmptyState title="Tidak ada data" message="Sesuaikan filter atau pencarian Anda." onAction={clearFilters} actionLabel="Reset Filter" />}
          
          {!loading && !errorMessage && items.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '350px' }}>Nama Karyawan</th>
                      <th>Departemen</th>
                      <th>Jabatan</th>
                      <th>Lokasi</th>
                      <th>Tanggal Masuk</th>
                      <th className="th-center">Status</th>
                      {canManageEmployees && <th className="th-center" style={{ width: '120px' }}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">{getInitial(item.user?.name)}</div>
                            <div className="cell-stacked">
                              <button className="cell-name-text employee-name-link" onClick={() => navigate(`/employees/${item.id}`)}>
                                {item.user?.name || "Unknown"}
                              </button>
                              <span className="cell-stacked__sub">{item.employee_code || item.id}</span>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ fontWeight: 600, color: '#475569' }}>{item.department || "-"}</span></td>
                        <td><span style={{ fontWeight: 500, color: '#64748b' }}>{item.position || "-"}</span></td>
                        <td><span className="badge-soft badge-soft--blue">{item.InputLocation || item.ProjectID || item.ServerID || item.PlaceOfApp || allLocations.find(l => String(l.id) === String(item.location_id))?.name || "-"}</span></td>
                        <td>
                          <div className="cell-stacked">
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatDateTime(item.hire_date)}</span>
                            <span className="cell-stacked__sub">Join Date</span>
                          </div>
                        </td>
                        <td className="td-center">
                          <span className={`badge-soft badge-soft--${item.status === "active" ? "green" : item.status === "pending" ? "orange" : "red"}`}>
                            {item.status === "active" ? "Aktif" : item.status === "pending" ? "Probation" : "Resigned"}
                          </span>
                        </td>
                        {canManageEmployees && (
                          <td className="td-center">
                            <div className="action-btn-group">
                              {canUpdateEmployee && (
                                <button className="action-btn action-btn-edit" onClick={() => navigate(`/employees/update/${item.id}`)} title="Edit"><Pencil size={16} /></button>
                              )}
                              {canDeleteEmployee && (
                                <button className="action-btn action-btn-delete" onClick={() => setDeleteTarget(item)} title="Hapus"><Trash2 size={16} /></button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="table-pagination">
                <div className="pagination-info">
                  {totalEmployees === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalEmployees)} dari ${totalEmployees} data`}
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>‹</button>
                  {paginationItems.map((page, index) => page === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">…</span>
                  ) : (
                    <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                  ))}
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <EmployeeLifecycleModals
        activeActionModal={activeActionModal}
        setActiveActionModal={setActiveActionModal}
        onboardingDate={onboardingDate}
        setOnboardingDate={setOnboardingDate}
        offboardingDate={offboardingDate}
        setOffboardingDate={setOffboardingDate}
        offboardingReason={offboardingReason}
        setOffboardingReason={setOffboardingReason}
        handleLifecycleAction={handleLifecycleAction}
        loading={loading}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Karyawan"
        message={`Karyawan "${deleteTarget?.user?.name || deleteTarget?.employee_code || "ini"}" akan dihapus secara permanen.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={loading}
        onConfirm={() => void confirmDeleteEmployee()}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  );
};

export default EmployeesPage;
