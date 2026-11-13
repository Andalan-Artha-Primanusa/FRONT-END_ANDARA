import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui";
import { showToast } from '@/shared/ui/toast';
import { assignRolesToUser, getAllUsers, getAllRoles } from "@/features/admin/api/admin.service";
import type { Role } from "@/shared/types/rbac.types";
import { Search, Users, ShieldCheck, CheckSquare, ChevronLeft, Shield } from "lucide-react";
import "./AdminCrudPages.css";
import "../dashboard/overview/OverviewPage.css";

interface UserListItem {
  id: number;
  name: string;
  email: string;
  role_names: string[];
}

const AdminUserAssignRolesPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getAllUsers(1, 100);
      const formattedUsers = (result.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        role_names: Array.isArray(item.roles) ? item.roles.map((r: any) => r.display_name || r.name) : [],
      }));
      setUsers(formattedUsers);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal memuat users.";
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const result = await getAllRoles(1, 100);
      setRoles((result.items || []) as Role[]);
    } catch (error) {
      console.error("Failed to load roles:", error);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter((u) => {
      const name = String(u?.name || '').toLowerCase();
      const email = String(u?.email || '').toLowerCase();
      return name.includes(lowerQuery) || email.includes(lowerQuery);
    });
  }, [users, searchQuery]);

  const handleSelectUser = (user: UserListItem) => {
    setSelectedUser(user);
    const currentRoleIds = roles
      .filter(r => user.role_names.includes(r.display_name || r.name))
      .map(r => r.id);
    
    setSelectedRoleIds(currentRoleIds);
    window.scrollTo({ top: document.getElementById('assignment-section')?.offsetTop || 0, behavior: 'smooth' });
  };

  const handleToggleRole = (roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleAssignRoles = async () => {
    if (!selectedUser) return;

    if (selectedRoleIds.length === 0) {
      showToast("Pilih minimal satu peran.", 'info');
      return;
    }

    setIsAssigning(true);

    try {
      await assignRolesToUser(selectedUser.id.toString(), { role_ids: selectedRoleIds });
      showToast(`Peran untuk ${selectedUser.name} berhasil diperbarui!`, 'success');
      setSelectedUser(null);
      setSelectedRoleIds([]);
      await loadUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal menetapkan peran.";
      showToast(message, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    void loadRoles();
  }, []);

  return (
    <div className="crud-page">
      <PageHeader
        title="Manajemen Peran Pengguna"
        subtitle="Pilih karyawan berdasarkan ID atau Nama untuk menyesuaikan hak akses mereka."
        badge={{ icon: Shield, label: "Security Center" }}
        actions={
          <button type="button" className="btn-outline" onClick={() => navigate("/admin/users")}>
            <ChevronLeft size={16} style={{ marginRight: '8px' }} />
            Kembali
          </button>
        }
        className="mb-8"
      />

      <div className="crud-content-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Section 1: User Selection */}
        <Card glass style={{ padding: '2rem', borderRadius: '32px', height: 'fit-content', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
              <Users size={24} color="var(--color-primary)" /> 1. Pilih Karyawan
            </h3>
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Cari ID atau Nama..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ maxHeight: '600px', overflowY: 'auto', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>ID</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>Karyawan</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>Peran Saat Ini</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Memuat data...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Tidak ada karyawan ditemukan.</td></tr>
                ) : filteredUsers.map((u) => (
                  <tr 
                    key={u.id} 
                    onClick={() => handleSelectUser(u)}
                    style={{ 
                      cursor: 'pointer', 
                      backgroundColor: selectedUser?.id === u.id ? '#eff6ff' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <td style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>#{u.id}</span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{u.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {u.role_names.length > 0 ? u.role_names.map((rn, idx) => (
                          <span key={idx} style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', fontSize: '0.75rem', fontWeight: 700 }}>
                            {rn}
                          </span>
                        )) : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div id="assignment-section" style={{ position: 'relative' }}>
          <Card glass style={{ padding: '2rem', borderRadius: '32px', opacity: selectedUser ? 1 : 0.6, pointerEvents: selectedUser ? 'auto' : 'none', transition: 'all 0.3s ease', border: '1px solid rgba(255,255,255,0.2)' }}>
            <h3 style={{ margin: '0 0 2rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
              <ShieldCheck size={24} color="var(--color-primary)" /> 2. Sesuaikan Peran
            </h3>
            
            {selectedUser && (
              <div style={{ marginBottom: '2rem', padding: '1.25rem', borderRadius: '16px', background: '#eff6ff', border: '1px solid var(--color-primary-light)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', marginBottom: '4px' }}>Karyawan Terpilih</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{selectedUser.name} <span style={{ opacity: 0.6, fontSize: '0.9rem', fontWeight: 600 }}>(#{selectedUser.id})</span></div>
              </div>
            )}

            <div style={{ borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '1rem', width: '60px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>Pilih</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>Nama Peran</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr 
                      key={role.id} 
                      onClick={() => handleToggleRole(role.id)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s', backgroundColor: selectedRoleIds.includes(role.id) ? '#f8fafc' : 'transparent' }}
                    >
                      <td style={{ padding: '1.25rem 1rem', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        {selectedRoleIds.includes(role.id) ? (
                          <div style={{ width: '24px', height: '24px', background: 'var(--color-primary)', borderRadius: '6px', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
                            <CheckSquare size={16} color="white" />
                          </div>
                        ) : (
                          <div style={{ width: '24px', height: '24px', border: '2px solid #cbd5e1', borderRadius: '6px', margin: '0 auto' }} />
                        )}
                      </td>
                      <td style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{role.display_name || role.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{role.name}</div>
                        {role.id === 1 && <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.7rem', color: '#ef4444', fontWeight: 800, background: '#fef2f2', padding: '2px 8px', borderRadius: '4px' }}>🔒 HANYA SUPER ADMIN</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button 
                variant="outline" 
                size="md" 
                onClick={() => setSelectedUser(null)}
                disabled={isAssigning}
                style={{ borderRadius: '14px', fontWeight: 700, padding: '0 1.5rem', height: '48px' }}
              >
                Batal
              </Button>
              <Button 
                variant="primary" 
                size="md" 
                onClick={() => void handleAssignRoles()}
                disabled={isAssigning || !selectedUser || selectedRoleIds.length === 0}
                style={{ borderRadius: '14px', fontWeight: 800, padding: '0 2rem', height: '48px', boxShadow: '0 4px 12px rgba(10, 122, 62, 0.2)' }}
              >
                {isAssigning ? "Menyimpan..." : "✓ Simpan Peran"}
              </Button>
            </div>
            
            {!selectedUser && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)', zIndex: 10, borderRadius: '32px' }}>
                <div style={{ textAlign: 'center', padding: '2.5rem', borderRadius: '24px', backgroundColor: 'white', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                  <Users size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                  <div style={{ fontWeight: 800, color: '#64748b', fontSize: '1.1rem' }}>Silakan pilih karyawan terlebih dahulu</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>Pilih dari daftar di sebelah kiri untuk menyesuaikan peran.</div>
                </div>
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AdminUserAssignRolesPage;
