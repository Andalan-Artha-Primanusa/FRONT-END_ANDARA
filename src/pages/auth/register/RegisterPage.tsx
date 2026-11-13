import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getRoleBasedDashboardPath } from "@/features/auth/utils/roleRedirect";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../AuthLayout";
import GoogleIcon from "../GoogleIcon";

interface RegisterFieldErrors {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
}

const RegisterPage = () => {
  const { handleRegister, handleGoogleLogin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSsoSubmitting, setIsSsoSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setErrorMessage(null);
  };

  const validate = () => {
    const nextErrors: RegisterFieldErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Full name is required.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Invalid email is and now invalid";
    }

    if (!form.password) {
      nextErrors.password = "Password is required.";
    }

    if (!form.password_confirmation) {
      nextErrors.password_confirmation = "Confirm password is required.";
    } else if (form.password !== form.password_confirmation) {
      nextErrors.password_confirmation = "Password and confirmation must match.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await handleRegister({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
      });

      // Check for validation errors returned by hook
      if (result && "success" in result && result.success === false) {
        if (result.errors) {
          const firstError = Object.values(result.errors)[0];
          setErrorMessage(String(firstError));
        }
        return;
      }

      // Success path
      if (result && "user" in result) {
        navigate(getRoleBasedDashboardPath(result.user));
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat registrasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setIsSsoSubmitting(true);

    try {
      const redirectUrl = await handleGoogleLogin();
      window.location.assign(redirectUrl);
    } catch (err: unknown) {
      setErrorMessage(typeof err === "string" ? err : "Register with Google gagal.");
      setIsSsoSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create account!"
      subtitle="Secure Register"
      visualContent={
        <div className="auth-fortis-panel">

          <p className="auth-fortis-summary">
            Membangun budaya kerja yang kuat, adaptif, dan berkelanjutan melalui nilai inti FORTIS.
          </p>

          <div className="auth-fortis-grid">
            <article className="auth-fortis-item">
              <img src="/F.png" alt="F - Focus" className="auth-fortis-icon" />
              <div>
                <strong>F — Focus</strong>
                <span>Fokus pada tujuan dan kualitas.</span>
              </div>
            </article>
            <article className="auth-fortis-item">
              <img src="/O.png" alt="O - Ownership" className="auth-fortis-icon" />
              <div>
                <strong>O — Ownership</strong>
                <span>Bertanggung jawab terhadap setiap hasil.</span>
              </div>
            </article>
            <article className="auth-fortis-item">
              <img src="/R.png" alt="R - Responsibility" className="auth-fortis-icon" />
              <div>
                <strong>R — Responsibility</strong>
                <span>Menjaga komitmen dan kepercayaan.</span>
              </div>
            </article>
            <article className="auth-fortis-item">
              <img src="/T.png" alt="T - Teamwork" className="auth-fortis-icon" />
              <div>
                <strong>T — Teamwork</strong>
                <span>Tumbuh bersama melalui kolaborasi.</span>
              </div>
            </article>
            <article className="auth-fortis-item">
              <img src="/I.png" alt="I - Innovation" className="auth-fortis-icon" />
              <div>
                <strong>I — Innovation</strong>
                <span>Selalu berkembang dan mencari solusi baru.</span>
              </div>
            </article>
            <article className="auth-fortis-item">
              <img src="/S.png" alt="S - Safety" className="auth-fortis-icon" />
              <div>
                <strong>S — Safety</strong>
                <span>Mengutamakan keamanan dan keberlanjutan.</span>
              </div>
            </article>
          </div>
        </div>
      }
      footer={
        <p className="auth-footer">
          Already have an account?{" "}
          <button
            type="button"
            className="auth-footer-link"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            value={form.name}
            autoComplete="name"
            placeholder="John Doe"
            onChange={handleChange}
            className={`auth-input ${fieldErrors.name ? "auth-input-error" : ""}`}
          />
          {fieldErrors.name && (
            <p className="auth-field-error">
              <AlertCircle size={16} />
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            autoComplete="email"
            placeholder="Email email@gmail.com"
            onChange={handleChange}
            className={`auth-input ${fieldErrors.email ? "auth-input-error" : ""}`}
          />
          {fieldErrors.email && (
            <p className="auth-field-error">
              <AlertCircle size={16} />
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <div className="auth-password-wrap">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              autoComplete="new-password"
              placeholder="Password"
              onChange={handleChange}
              className={`auth-input ${fieldErrors.password ? "auth-input-error" : ""}`}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="auth-field-error">
              <AlertCircle size={16} />
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password_confirmation">
            Confirm Password
          </label>
          <div className="auth-password-wrap">
            <input
              id="password_confirmation"
              name="password_confirmation"
              type={showConfirmPassword ? "text" : "password"}
              value={form.password_confirmation}
              autoComplete="new-password"
              placeholder="Confirm Password"
              onChange={handleChange}
              className={`auth-input ${fieldErrors.password_confirmation ? "auth-input-error" : ""}`}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {fieldErrors.password_confirmation && (
            <p className="auth-field-error">
              <AlertCircle size={16} />
              {fieldErrors.password_confirmation}
            </p>
          )}
        </div>

        {errorMessage && <p className="auth-form-error">{errorMessage}</p>}

        <button
          type="submit"
          className="auth-primary-button"
          disabled={isSubmitting || isSsoSubmitting}
        >
          {isSubmitting ? <Loader2 size={18} className="auth-button-spinner" /> : null}
          Register
        </button>

        <button
          type="button"
          className="auth-social-button"
          onClick={handleGoogleSignUp}
          disabled={isSubmitting || isSsoSubmitting}
        >
          {isSsoSubmitting ? <Loader2 size={18} className="auth-button-spinner" /> : <GoogleIcon />}
          {isSsoSubmitting ? "Redirecting to Google..." : "Register with Google (SSO)"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
