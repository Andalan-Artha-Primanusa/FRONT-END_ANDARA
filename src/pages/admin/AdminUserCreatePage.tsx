import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, Eye, EyeOff, KeyRound, Loader2, Shield, UserPlus } from "lucide-react";
import { Card } from "@/shared/ui";
import { createUser, getAllRoles } from "@/features/admin/api/admin.service";
import { showToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/errorHandler";
import CompanyScopeBadge from "@/shared/components/CompanyScopeBadge";
import { PageHeader } from "@/shared/ui";
import "@/shared/styles/CrudPage.css";
import "@/pages/auth/AuthLayout.css";
import "@/pages/dashboard/custom/CustomDashboardPage.css";
import "@/pages/payroll/PayrollShared.css";
import "@/pages/profiles/ProfilesPage.css";
import "./AdminUsersPage.css";

interface RoleOption {
  id: number;
  name: string;
  display_name?: string;
}

interface CreateUserResult {
  email: string;
  temporaryPassword: string;
  mustChangePassword: boolean;
}

const createLocalPassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%";
  const chars = alphabet + symbols;
  const values = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(values, (value) => chars[value % chars.length]).join("");
};

const AdminUserCreatePage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [generatePassword, setGeneratePassword] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<CreateUserResult | null>(null);

  const selectedRoleNames = useMemo(() => {
    if (roleIds.length === 0) return "Belum ada role";
    return roles
      .filter((role) => roleIds.includes(role.id))
      .map((role) => role.display_name || role.name)
      .join(", ");
  }, [roleIds, roles]);

  useEffect(() => {
    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const result = await getAllRoles(1, 200);
        setRoles((result.items || []) as RoleOption[]);
      } catch (error) {
        showToast(getErrorMessage(error as never) || "Gagal memuat role", "error");
      } finally {
        setLoadingRoles(false);
      }
    };

    void loadRoles();
  }, []);

  const toggleRole = (roleId: number) => {
    setRoleIds((prev) => prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]);
  };

  const handleCopyPassword = async () => {
    if (!createdAccount?.temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(createdAccount.temporaryPassword);
      showToast("Password sementara disalin", "success");
    } catch {
      showToast("Tidak bisa menyalin otomatis dari browser ini", "error");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      showToast("Nama wajib diisi", "error");
      return;
    }

    if (!email.trim()) {
      showToast("Email wajib diisi", "error");
      return;
    }

    if (!generatePassword && password.length < 8) {
      showToast("Password manual minimal 8 karakter", "error");
      return;
    }

    setSubmitting(true);
    setCreatedAccount(null);

    try {
      const response = await createUser({
        name: name.trim(),
        email: email.trim(),
        password: generatePassword ? undefined : password,
        generate_password: generatePassword,
        must_change_password: mustChangePassword,
        role_ids: roleIds,
      });

      const payload = response.data as Record<string, unknown>;
      setCreatedAccount({
        email: email.trim(),
        temporaryPassword: String(payload.temporary_password || password),
        mustChangePassword: Boolean(payload.must_change_password ?? mustChangePassword),
      });
      showToast("Akun berhasil dibuat", "success");
      setName("");
      setEmail("");
      setPassword("");
      setRoleIds([]);
      setGeneratePassword(true);
      setMustChangePassword(true);
    } catch (error) {
      showToast(getErrorMessage(error as never) || "Gagal membuat akun", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Buat Akun"
        subtitle="Buat akun login baru, tetapkan role, dan berikan password sementara untuk reset saat login pertama."
        badge={{ icon: UserPlus, label: "Admin Access" }}
        scope
        actions={
          <button type="button" className="btn-outline" onClick={() => navigate("/admin/users")}>
            <ArrowLeft size={16} />
            Kembali
          </button>
        }
      />

      <div className="custom-dashboard-grid" style={{ alignItems: "start" }}>
        <Card className="dashboard-settings-panel">
          <div className="settings-title">
            <KeyRound size={20} color="var(--color-primary)" />
            <h2>Data Akun</h2>
          </div>

          <form className="profiles-form-grid" onSubmit={handleSubmit}>
            <label className="profiles-form-group">
              <span>Nama</span>
              <input className="profiles-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama pengguna" />
            </label>
            <label className="profiles-form-group">
              <span>Email</span>
              <input className="profiles-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@company.com" />
            </label>

            <label className="profiles-form-group" style={{ gridColumn: "1 / -1" }}>
              <span>Password</span>
              <div className="auth-password-wrap">
                <input
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  disabled={generatePassword}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={generatePassword ? "Digenerate otomatis oleh backend" : "Minimal 8 karakter"}
                />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((prev) => !prev)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!generatePassword && (
                <button type="button" className="btn-outline" onClick={() => setPassword(createLocalPassword())}>
                  <KeyRound size={16} />
                  Generate Manual
                </button>
              )}
            </label>

            <label className="profiles-form-group" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={generatePassword}
                onChange={(event) => setGeneratePassword(event.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--color-primary)" }}
              />
              <span>Generate password otomatis</span>
            </label>

            <label className="profiles-form-group" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={mustChangePassword}
                onChange={(event) => setMustChangePassword(event.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--color-primary)" }}
              />
              <span>Wajib reset saat login pertama</span>
            </label>

            <button type="submit" className="btn-primary" disabled={submitting} style={{ gridColumn: "1 / -1" }}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {submitting ? "Membuat akun..." : "Buat Akun"}
            </button>
          </form>
        </Card>

        <Card className="dashboard-settings-panel">
          <div className="settings-title">
            <Shield size={20} color="var(--color-primary)" />
            <h2>Role Akun</h2>
          </div>
          <p className="saved-count">Role dipilih: {selectedRoleNames}</p>
          <div className="widget-list">
            {loadingRoles ? (
              <div className="dashboard-empty-preview">Memuat role...</div>
            ) : roles.length === 0 ? (
              <div className="dashboard-empty-preview">Role belum tersedia.</div>
            ) : (
              roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={`widget-choice ${roleIds.includes(role.id) ? "selected" : ""}`}
                  onClick={() => toggleRole(role.id)}
                >
                  <strong>{role.display_name || role.name}</strong>
                  <small>{role.name}</small>
                </button>
              ))
            )}
          </div>

          {createdAccount && (
            <div className="payroll-workflow-card" style={{ marginTop: 16 }}>
              <div className="payroll-workflow-header">
                <div>
                  <p className="payroll-workflow-eyebrow">Akun Dibuat</p>
                  <h2>{createdAccount.email}</h2>
                </div>
                <span className="payroll-workflow-status">
                  <CheckCircle2 size={16} />
                  {createdAccount.mustChangePassword ? "Force reset aktif" : "Aktif"}
                </span>
              </div>
              <label className="profiles-form-group">
                <span>Password sementara</span>
                <input className="profiles-input" readOnly value={createdAccount.temporaryPassword} />
              </label>
              <button type="button" className="btn-outline" onClick={handleCopyPassword}>
                <Copy size={16} />
                Salin Password
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminUserCreatePage;
