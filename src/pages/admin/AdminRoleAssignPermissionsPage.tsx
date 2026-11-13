import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/app/store/auth.store";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui";
import { showToast } from '@/shared/ui/toast';
import { assignPermissionsToRole, getAllRoles, getAllPermissions } from "@/features/admin/api/admin.service";
import { getErrorMessage } from "@/shared/api/errorHandler";
import { RBACUtils } from "@/shared/hooks/rbac";
import type { Permission } from "@/shared/types/rbac.types";
import { Search, ShieldCheck, Key, Layers, Activity, CheckSquare, Square, ChevronRight } from "lucide-react";
import "./AdminCrudPages.css";

interface RoleData {
  id: number;
  name: string;
  display_name: string;
  permissions_count?: number;
  permissions?: Permission[];
}

const AdminRoleAssignPermissionsPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canManageRoles = RBACUtils.canManageRoles(user);
  
  if (!canManageRoles) {
    return (
      <div className="crud-page">
        <PageHeader
          title="Akses Ditolak"
          subtitle="Anda tidak memiliki izin untuk mengakses halaman ini."
        />
        <Card className="crud-card" glass>
          <p>Silahkan hubungi Administrator untuk mendapatkan akses.</p>
        </Card>
      </div>
    );
  }
  
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [permSearch, setPermSearch] = useState("");

  const loadRoles = async () => {
    setLoading(true);
    try {
      const result = await getAllRoles();
      const formattedRoles = result.items.map((item: any) => {
        const displayName = item.display_name || item.name || `Peran ${item.id}`;
        const name = item.name || '';
        const permCount = item.permissions_count || (Array.isArray(item.permissions) ? item.permissions.length : 0);
        
        return {
          id: item.id,
          name: name,
          display_name: displayName,
          permissions_count: permCount,
          permissions: item.permissions || [],
        };
      });
      setRoles(formattedRoles);
    } catch (error: unknown) {
      const message = getErrorMessage(error as any);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const result = await getAllPermissions();
      setPermissions(result.items as Permission[]);
    } catch (error: unknown) {
      const message = getErrorMessage(error as any);
      console.error("Failed to load permissions:", message);
    }
  };

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    
    const filtered = permSearch 
      ? permissions.filter(p => {
          const name = String(p?.name || '').toLowerCase();
          const displayName = String(p?.display_name || '').toLowerCase();
          const query = permSearch.toLowerCase();
          return name.includes(query) || displayName.includes(query);
        })
      : permissions;

    filtered.forEach(p => {
      // Group by prefix (e.g. attendance.view -> attendance)
      const prefix = p.name.includes('.') ? p.name.split('.')[0] : 'other';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(p);
    });

    return groups;
  }, [permissions, permSearch]);

  const handleSelectRole = (role: RoleData) => {
    setSelectedRole(role);
    // If permissions are pre-loaded in role, initialize selection
    if (role.permissions) {
      setSelectedPermissionIds(role.permissions.map(p => p.id));
    } else {
      setSelectedPermissionIds([]);
    }
    window.scrollTo({ top: document.getElementById('perm-assignment-section')?.offsetTop || 0, behavior: 'smooth' });
  };

  const handleTogglePermission = (permissionId: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleAssignPermissions = async () => {
    if (!selectedRole) return;

    if (selectedPermissionIds.length === 0) {
      showToast("Pilih minimal satu izin.", 'info');
      return;
    }

    if (selectedRole.id === 1) {
      showToast("Hanya Super Admin yang dapat memodifikasi peran Super Admin.", 'error');
      return;
    }

    setIsAssigning(true);
    showToast("Sedang menetapkan izin...", 'info');

    try {
      await assignPermissionsToRole(selectedRole.id.toString(), { permission_ids: selectedPermissionIds });
      showToast(`Izin untuk peran ${selectedRole.display_name} berhasil diperbarui!`, 'success');
      setSelectedRole(null);
      setSelectedPermissionIds([]);
      await loadRoles();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal menetapkan izin ke peran.";
      showToast(message, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  useEffect(() => {
    void loadRoles();
    void loadPermissions();
  }, []);

  return (
    <div className="crud-page">
      <PageHeader
        title="Hubungkan Izin & Peran"
        subtitle="Tentukan hak akses spesifik untuk setiap tingkatan peran dalam sistem."
        badge={{ icon: Key, label: "Admin Center" }}
        actions={
          <Button variant="outline" size="md" onClick={() => navigate("/admin/roles")}>
            ← Kembali ke Peran
          </Button>
        }
      />

      <div className="crud-content-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.8fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Step 1: Role Selection Table */}
        <Card className="crud-card" glass style={{ height: 'fit-content' }}>
          <h2><Activity size={20} style={{ marginRight: '8px' }} /> 1. Pilih Peran</h2>
          <div className="crud-table-wrap" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Peran</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Izin</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={2} style={{ textAlign: 'center', padding: '2rem' }}>Memuat peran...</td></tr>
                ) : roles.map((r) => (
                  <tr 
                    key={r.id} 
                    onClick={() => handleSelectRole(r)}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedRole?.id === r.id ? 'rgba(10, 122, 62, 0.1)' : 'transparent',
                      borderLeft: selectedRole?.id === r.id ? '4px solid var(--primary)' : 'none'
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.display_name}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{r.name}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>
                        {r.permissions_count || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Step 2: Permissions Assignment Section */}
        <div id="perm-assignment-section">
          <Card className="crud-card" glass style={{ opacity: selectedRole ? 1 : 0.6, pointerEvents: selectedRole ? 'auto' : 'none', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ margin: 0 }}><Key size={20} style={{ marginRight: '8px' }} /> 2. Pilih Hak Akses</h2>
              <div className="search-box" style={{ maxWidth: '300px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={16} color="var(--primary)" />
                <input 
                  type="text" 
                  placeholder="Cari izin atau modul..." 
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '100%' }}
                />
              </div>
            </div>

            {selectedRole && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '10px', backgroundColor: 'var(--primary-lighter)', border: '1px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>KONFIGURASI PERAN</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedRole.display_name} <span style={{ opacity: 0.5, fontWeight: 500 }}>({selectedRole.name})</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{selectedPermissionIds.length}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>IZIN TERPILIH</div>
                </div>
              </div>
            )}

            <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {Object.keys(groupedPermissions).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <Layers size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>Tidak ada izin ditemukan.</p>
                </div>
              ) : Object.entries(groupedPermissions).map(([group, perms]) => (
                <div key={group} style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem', borderBottom: '1px solid var(--primary-light)', paddingBottom: '0.4rem' }}>
                    <ChevronRight size={18} color="var(--primary)" />
                    <h3 style={{ margin: 0, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: 800 }}>Modul: {group}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {perms.map((perm) => (
                      <div 
                        key={perm.id} 
                        onClick={() => handleTogglePermission(perm.id)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px', 
                          padding: '0.8rem', 
                          borderRadius: '8px', 
                          backgroundColor: selectedPermissionIds.includes(perm.id) ? 'rgba(10, 122, 62, 0.08)' : 'rgba(248, 250, 252, 0.8)',
                          border: '1px solid',
                          borderColor: selectedPermissionIds.includes(perm.id) ? 'var(--primary-light)' : 'rgba(226, 232, 240, 0.8)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {selectedPermissionIds.includes(perm.id) ? (
                          <CheckSquare size={18} color="var(--primary)" />
                        ) : (
                          <Square size={18} color="#cbd5e1" />
                        )}
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: selectedPermissionIds.includes(perm.id) ? 'var(--primary)' : 'var(--text)' }}>
                            {perm.display_name || perm.name.split('.').pop()?.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '0.65rem', opacity: 0.6, fontFamily: "'Poppins', sans-serif" }}>{perm.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="crud-actions" style={{ marginTop: '2rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <Button 
                variant="outline" 
                size="md" 
                onClick={() => setSelectedRole(null)}
                disabled={isAssigning}
              >
                Batal
              </Button>
              <Button 
                variant="primary" 
                size="md" 
                onClick={() => void handleAssignPermissions()}
                disabled={isAssigning || !selectedRole || selectedPermissionIds.length === 0}
                style={{ minWidth: '180px' }}
              >
                {isAssigning ? "Menyimpan..." : (
                   <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <ShieldCheck size={18} /> Simpan Hak Akses
                   </span>
                )}
              </Button>
            </div>

            {!selectedRole && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(1px)', zIndex: 10 }}>
                <div style={{ textAlign: 'center', padding: '1.5rem', borderRadius: '12px', backgroundColor: 'white', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
                  <Layers size={40} color="#94a3b8" style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <div style={{ fontWeight: 700, color: '#64748b', fontSize: '1.1rem' }}>Pilih Peran Terlebih Dahulu</div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Gunakan tabel di sebelah kiri untuk memilih tingkatan peran.</p>
                </div>
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AdminRoleAssignPermissionsPage;
