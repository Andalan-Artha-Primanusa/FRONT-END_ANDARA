import { useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../AuthLayout';
import { resetPassword } from '@/features/auth/api/auth.service';

interface ResetFieldErrors {
  email?: string;
  password?: string;
  password_confirmation?: string;
  token?: string;
}

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const tokenFromQuery = searchParams.get('token') || '';
    const emailFromQuery = searchParams.get('email') || '';
    setToken(tokenFromQuery);
    setEmail(emailFromQuery);
  }, [searchParams]);

  const validate = () => {
    const nextErrors: ResetFieldErrors = {};

    if (!token.trim()) {
      nextErrors.token = 'Token reset tidak valid atau tidak ditemukan.';
    }

    if (!email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Invalid email format.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      nextErrors.password = 'Password minimal 8 karakter.';
    }

    if (!passwordConfirmation) {
      nextErrors.password_confirmation = 'Confirm password is required.';
    } else if (password !== passwordConfirmation) {
      nextErrors.password_confirmation = 'Password dan konfirmasi harus sama.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await resetPassword({
        token: token.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });

      setSuccessMessage(res?.message || 'Password berhasil direset.');
      setTimeout(() => navigate('/login'), 1400);
    } catch (err: any) {
      if (err?.type === 'validation' && err?.errors) {
        const firstError = Object.values(err.errors)[0];
        setFormError(String(firstError));
      } else {
        setFormError(err?.message || 'Gagal reset password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Create a New Password"
      footer={
        <p className="auth-footer">
          Back to{' '}
          <button
            type="button"
            className="auth-footer-link"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
              setFormError(null);
            }}
            className={`auth-input ${fieldErrors.email ? 'auth-input-error' : ''}`}
          />
          {fieldErrors.email && (
            <p className="auth-field-error"><AlertCircle size={16} />{fieldErrors.email}</p>
          )}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password">New Password</label>
          <div className="auth-password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                setFormError(null);
              }}
              className={`auth-input ${fieldErrors.password ? 'auth-input-error' : ''}`}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="auth-field-error"><AlertCircle size={16} />{fieldErrors.password}</p>
          )}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password_confirmation">Confirm Password</label>
          <div className="auth-password-wrap">
            <input
              id="password_confirmation"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(e) => {
                setPasswordConfirmation(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password_confirmation: undefined }));
                setFormError(null);
              }}
              className={`auth-input ${fieldErrors.password_confirmation ? 'auth-input-error' : ''}`}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {fieldErrors.password_confirmation && (
            <p className="auth-field-error"><AlertCircle size={16} />{fieldErrors.password_confirmation}</p>
          )}
        </div>

        {fieldErrors.token && <p className="auth-form-error">{fieldErrors.token}</p>}
        {formError && <p className="auth-form-error">{formError}</p>}
        {successMessage && (
          <p className="auth-form-success" style={{ color: '#047857', fontSize: '0.9rem', fontWeight: 600 }}>
            {successMessage}
          </p>
        )}

        <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={18} className="auth-button-spinner" /> : null}
          Reset Password
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
