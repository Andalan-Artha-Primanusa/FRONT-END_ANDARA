import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../AuthLayout";
import { changePassword } from "@/features/auth/api/auth.service";
import { useAuthStore } from "@/app/store/auth.store";

interface ForceResetErrors {
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}

const ForceResetPasswordPage = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ForceResetErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const nextErrors: ForceResetErrors = {};

    if (!currentPassword) nextErrors.current_password = "Password sementara wajib diisi.";
    if (!password) nextErrors.password = "Password baru wajib diisi.";
    else if (password.length < 8) nextErrors.password = "Password minimal 8 karakter.";
    if (!passwordConfirmation) nextErrors.password_confirmation = "Konfirmasi password wajib diisi.";
    else if (password !== passwordConfirmation) nextErrors.password_confirmation = "Konfirmasi password tidak sama.";
    if (currentPassword && password && currentPassword === password) {
      nextErrors.password = "Password baru tidak boleh sama dengan password sementara.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccessMessage(response?.message || "Password berhasil diganti. Silakan login kembali.");
      logout();
      setTimeout(() => navigate("/login", { replace: true }), 1000);
    } catch (err: any) {
      if (err?.type === "validation" && err?.errors) {
        const firstError = Object.values(err.errors)[0];
        setFormError(String(firstError));
      } else {
        setFormError(err?.message || "Gagal mengganti password.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordInput = (
    id: string,
    label: string,
    value: string,
    setValue: (value: string) => void,
    show: boolean,
    setShow: (value: boolean) => void,
    error?: string
  ) => (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className="auth-password-wrap">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={id === "current_password" ? "current-password" : "new-password"}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setFieldErrors((prev) => ({ ...prev, [id]: undefined }));
            setFormError(null);
          }}
          className={`auth-input ${error ? "auth-input-error" : ""}`}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="auth-field-error"><AlertCircle size={14} />{error}</p>}
    </div>
  );

  return (
    <AuthLayout
      title="Reset Password Wajib"
      subtitle="Password sementara harus diganti sebelum masuk sistem"
      footer={
        <p className="auth-footer">
          Sudah mengganti password?{" "}
          <button
            type="button"
            className="auth-footer-link"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Kembali ke Login
          </button>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {passwordInput("current_password", "Password Sementara", currentPassword, setCurrentPassword, showCurrentPassword, setShowCurrentPassword, fieldErrors.current_password)}
        {passwordInput("password", "Password Baru", password, setPassword, showPassword, setShowPassword, fieldErrors.password)}
        {passwordInput("password_confirmation", "Konfirmasi Password Baru", passwordConfirmation, setPasswordConfirmation, showConfirmPassword, setShowConfirmPassword, fieldErrors.password_confirmation)}

        {formError && <p className="auth-form-error">{formError}</p>}
        {successMessage && (
          <p className="auth-form-success" style={{ color: "var(--color-success)", fontSize: "0.9rem", fontWeight: 600 }}>
            {successMessage}
          </p>
        )}

        <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={18} className="auth-button-spinner" /> : null}
          Simpan Password Baru
        </button>
      </form>
    </AuthLayout>
  );
};

export default ForceResetPasswordPage;
