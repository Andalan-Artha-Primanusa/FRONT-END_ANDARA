import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../AuthLayout';
import { forgotPassword } from '@/features/auth/api/auth.service';

interface ForgotFieldErrors {
  email?: string;
}

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ForgotFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const nextErrors: ForgotFieldErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Invalid email format.';
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
      const res = await forgotPassword({ email: email.trim() });
      const message = res?.message || 'Link reset password telah dikirim ke email Anda.';
      setSuccessMessage(message);
    } catch (err: any) {
      if (err?.type === 'validation' && err?.errors) {
        const firstError = Object.values(err.errors)[0];
        setFormError(String(firstError));
      } else {
        setFormError(err?.message || 'Gagal mengirim link reset password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Reset Password Access"
      footer={
        <p className="auth-footer">
          Remember your password?{' '}
          <button
            type="button"
            className="auth-footer-link"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="email@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
              setFormError(null);
              setSuccessMessage(null);
            }}
            className={`auth-input ${fieldErrors.email ? 'auth-input-error' : ''}`}
          />
          {fieldErrors.email && (
            <p className="auth-field-error">
              <AlertCircle size={16} />
              {fieldErrors.email}
            </p>
          )}
        </div>

        {formError && <p className="auth-form-error">{formError}</p>}
        {successMessage && (
          <p className="auth-form-success" style={{ color: '#047857', fontSize: '0.9rem', fontWeight: 600 }}>
            {successMessage}
          </p>
        )}

        <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={18} className="auth-button-spinner" /> : null}
          Send Reset Link
        </button>

        <button
          type="button"
          className="auth-link-button"
          onClick={() => navigate('/login')}
        >
          Cancel
        </button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
