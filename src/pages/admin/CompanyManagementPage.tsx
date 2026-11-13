import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  MapPin,
  Mail,
  FileEdit,
  Power,
  PowerOff
} from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { PageHeader } from "@/shared/ui";
import { showToast } from "@/shared/ui/toast";
import { companyService, type Company, type CompanyUserAccess } from "@/features/company/api/company.service";
import { getAllUsers } from "@/features/admin/api/admin.service";
import type { AdminUser } from "@/features/admin/types/admin.types";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import "@/shared/styles/CrudPage.css";
import "./CompanyManagementPage.css";

const CompanyManagementPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setCompanyContext = useAuthStore((state) => state.setCompanyContext);
  
  const canManage = RBACUtils.hasPermission(user, [
    PERMISSIONS.COMPANY_CREATE,
    PERMISSIONS.COMPANY_ASSIGN_USER,
    PERMISSIONS.ADMIN_COMPANY_UPDATE,
  ]);
  const canView = RBACUtils.hasPermission(user, [
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.COMPANY_VIEW_ALL,
    PERMISSIONS.ADMIN_COMPANY_VIEW,
  ]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Modals state
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [viewUsersModal, setViewUsersModal] = useState(false);
  const [addUserModal, setAddUserModal] = useState(false);

  // User Access state
  const [accesses, setAccesses] = useState<CompanyUserAccess[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  
  // Assign User state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersWarning, setUsersWarning] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignScopeRole, setAssignScopeRole] = useState("member");
  const [assignIsDefault, setAssignIsDefault] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadCompanies = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await companyService.list();
      setCompanies(data);
    } catch (error: any) {
      setLoadError(true);
      showToast(error.response?.data?.message || "Gagal memuat company", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersWarning("");
    try {
      const result = await getAllUsers(1, 500);
      setUsers(result.items ?? []);
    } catch (error: any) {
      setUsers([]);
      if (error?.response?.status === 403 || error?.response?.status === 404) {
        setUsersWarning("Butuh permission admin untuk memuat daftar user. Assign user bisa diisi manual jika endpoint user tersedia.");
      } else {
        setUsersWarning("Gagal memuat daftar user.");
      }
    }
  };

  const loadAccesses = async (companyId: number) => {
    setAccessLoading(true);
    try {
      const result = await companyService.listUsers(companyId);
      setAccesses(result.accesses ?? []);
    } catch (error: any) {
      setAccesses([]);
      showToast(error.response?.data?.message || "Gagal memuat akses user", "error");
    } finally {
      setAccessLoading(false);
    }
  };

  const refreshCompanyContext = async () => {
    try {
      const context = await companyService.context();
      setCompanyContext(context);
    } catch {
      // Abaikan
    }
  };

  useEffect(() => {
    if (canView) {
      void loadCompanies();
    }
  }, [canView]);

  const openViewUsers = async (company: Company) => {
    setActiveCompanyId(company.id);
    setViewUsersModal(true);
    await loadAccesses(company.id);
  };

  const openAddUser = async (company: Company) => {
    setActiveCompanyId(company.id);
    setAssignUserId("");
    setAssignScopeRole("member");
    setAssignIsDefault(false);
    setAddUserModal(true);
    await loadUsers();
    await loadAccesses(company.id); // to check if already assigned
  };

  const deactivate = async (company: Company) => {
    if (!window.confirm(`Deactivate company "${company.name}"?`)) return;
    try {
      await companyService.deactivate(company.id);
      showToast("Company dinonaktifkan", "success");
      await loadCompanies();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Gagal menonaktifkan company", "error");
    }
  };

  const assignAccess = async () => {
    if (!activeCompanyId) return;
    if (!assignUserId) {
      showToast("Pilih user untuk di-assign", "error");
      return;
    }
    if (accesses.some((access) => access.user_id === Number(assignUserId))) {
      showToast("User sudah punya akses ke company ini", "info");
      return;
    }

    setAssigning(true);
    try {
      await companyService.assignUser(activeCompanyId, {
        user_id: Number(assignUserId),
        scope_role: assignScopeRole || undefined,
        is_default: assignIsDefault,
      });
      showToast("Akses company berhasil diberikan", "success");
      setAddUserModal(false);
      await loadAccesses(activeCompanyId);
      await refreshCompanyContext();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Gagal assign user", "error");
    } finally {
      setAssigning(false);
    }
  };

  const removeAccess = async (access: CompanyUserAccess) => {
    if (!activeCompanyId) return;
    const displayName = access.user?.name || `user #${access.user_id}`;
    if (!window.confirm(`Hapus akses "${displayName}" dari company ini?`)) return;
    try {
      await companyService.removeUser(activeCompanyId, access.user_id);
      showToast("Akses user dihapus", "success");
      await loadAccesses(activeCompanyId);
      await refreshCompanyContext();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Gagal menghapus akses user", "error");
    }
  };

  if (!canView) {
    return (
      <div className="crud-page">
        <PageHeader
          title="Akses Ditolak"
          subtitle="Anda tidak memiliki izin untuk melihat company."
          badge={{ icon: ShieldCheck, label: "Admin Center" }}
        />
      </div>
    );
  }

  const activeCompany = companies.find(c => c.id === activeCompanyId);

  return (
    <div className="crud-page company-management-page">
      <PageHeader
        title="Company Management"
        subtitle="Kelola company, legal entity, akses user, dan status operasional."
        badge={{ icon: Building2, label: "Multi Company" }}
        style={{ marginBottom: 24 }}
        actions={
          <>
            <Button variant="secondary" onClick={loadCompanies} disabled={loading}>
              <RefreshCw size={16} />
              Refresh
            </Button>
            {canManage && (
              <Button variant="primary" onClick={() => navigate("/companies/create")}>
                <Plus size={16} />
                Create Company
              </Button>
            )}
          </>
        }
      />

      {loadError && (
        <Card className="company-error-card">
          <AlertTriangle size={18} />
          <span>Gagal memuat daftar company. Pastikan koneksi ke backend tersedia, lalu tekan Refresh.</span>
        </Card>
      )}

      <div className="company-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {loading && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--color-text-light)' }}>Memuat company...</div>}
        
        {!loading && companies.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, background: 'var(--color-surface)', borderRadius: 12, border: '1px dashed var(--color-border)' }}>
            <Building2 size={40} style={{ color: 'var(--color-primary-light)', margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Belum ada company</h3>
            <p style={{ margin: 0, color: 'var(--color-text-light)' }}>Buat company pertama Anda untuk mulai.</p>
          </div>
        )}

        {!loading && companies.map((company) => (
          <Card key={company.id} className="company-item-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: 20, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 18, color: 'var(--color-text)' }}>{company.name}</h3>
                  <span style={{ fontSize: 13, color: 'var(--color-text-light)', background: 'var(--color-surface-hover)', padding: '2px 8px', borderRadius: 12 }}>
                    {company.code || "No Code"}
                  </span>
                </div>
                <span className={`audit-badge ${company.status === 'active' ? 'done' : 'todo'}`}>
                  {company.status === 'active' ? 'Active' : company.status || 'Inactive'}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, color: 'var(--color-text-light)', fontSize: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>{company.city || "Kota belum diatur"}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>{company.email || "Email belum diatur"}</span>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 20px', background: 'var(--color-surface-hover)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12 }}>
              <Button variant="primary" size="sm" style={{ flex: 1 }} onClick={() => openViewUsers(company)}>
                <Users size={14} />
                View
              </Button>
              {canManage && (
                <Button variant="outline" size="sm" style={{ flex: 1 }} onClick={() => openAddUser(company)}>
                  <UserPlus size={14} />
                  Add
                </Button>
              )}
              {canManage && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/companies/${company.id}/edit`)} title="Edit Company" style={{ padding: '0 10px' }}>
                    <FileEdit size={14} />
                  </Button>
                  {company.status !== 'inactive' && (
                    <Button variant="ghost" size="sm" onClick={() => deactivate(company)} title="Deactivate" style={{ padding: '0 10px', color: 'var(--color-danger)' }}>
                      <PowerOff size={14} />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Modal View Users */}
      <Modal
        isOpen={viewUsersModal}
        onClose={() => setViewUsersModal(false)}
        title={`Users: ${activeCompany?.name}`}
        size="md"
      >
        <div className="company-access-list" style={{ marginTop: 0, padding: 0 }}>
          {accessLoading && <div style={{ padding: 20, textAlign: 'center' }}>Memuat akses user...</div>}
          {!accessLoading && accesses.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-light)' }}>
              Belum ada user yang tergabung dalam company ini.
            </div>
          )}
          {!accessLoading && accesses.map((access) => (
            <div className="company-access-row" key={access.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--color-text)' }}>{access.user?.name || `User #${access.user_id}`}</strong>
                <small style={{ color: 'var(--color-text-light)' }}>{access.user?.email || ""}</small>
              </div>
              <div className="company-access-meta" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {access.is_default && <em className="access-default" style={{ fontSize: 12, color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '2px 6px', borderRadius: 4, fontStyle: 'normal' }}>default</em>}
                <em style={{ fontSize: 13, fontStyle: 'normal', color: 'var(--color-text-light)' }}>{access.scope_role || "member"}</em>
                {canManage && (
                  <button
                    type="button"
                    className="company-access-remove"
                    onClick={() => removeAccess(access)}
                    title="Hapus akses"
                    style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 4 }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <Button variant="outline" onClick={() => setViewUsersModal(false)}>Tutup</Button>
        </div>
      </Modal>

      {/* Modal Add User */}
      <Modal
        isOpen={addUserModal}
        onClose={() => setAddUserModal(false)}
        title={`Add User ke ${activeCompany?.name}`}
        size="md"
      >
        <div className="company-access-form" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!canManage && <p style={{ color: 'var(--color-danger)' }}>Butuh permission company.assign_user untuk mengelola akses user.</p>}
          {usersWarning && <p style={{ color: 'var(--color-warning)' }}>{usersWarning}</p>}
          
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>User
            <select value={assignUserId} onChange={(event) => setAssignUserId(event.target.value)} disabled={!canManage} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <option value="">Pilih user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>Role di Company
            <select value={assignScopeRole} onChange={(event) => setAssignScopeRole(event.target.value)} disabled={!canManage} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <option value="member">member</option>
              <option value="manager">manager</option>
              <option value="owner">owner</option>
            </select>
          </label>
          <label className="company-access-check" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={assignIsDefault}
              onChange={(event) => setAssignIsDefault(event.target.checked)}
              disabled={!canManage}
            />
            Jadikan default company untuk user ini
          </label>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <Button variant="outline" onClick={() => setAddUserModal(false)}>Batal</Button>
            <Button variant="primary" onClick={assignAccess} disabled={!canManage || assigning}>
              <UserPlus size={16} />
              {assigning ? "Menyimpan..." : "Assign User"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CompanyManagementPage;
