/**
 * LoginPage.jsx – SHOPEase Authentication — Wired to Backend
 * ============================================================
 *
 * VIVA: Authentication Flow:
 *   1. User fills email + password → clicks "Sign In"
 *   2. handleSubmit() fires → calls POST /api/auth/login via api.js (Axios)
 *   3. api.js interceptor adds Content-Type header automatically
 *   4. Spring Boot AuthController.login() verifies credentials
 *   5a. Success → backend returns { token, role, email, fullName }
 *       → auth.login(data) stores token in localStorage + React state
 *       → navigate('/') → Navbar immediately shows user info
 *   5b. Failure → backend returns 401 { message: "Invalid email or password." }
 *       → error.response.data.message shown in the red error box
 *
 * UX Design Choices:
 * - Button disabled + "Signing in..." text during API call (prevents double-submit)
 * - Error shown above the form (not below) so user sees it immediately
 * - Password show/hide toggle improves mobile UX significantly
 * - Focus ring on inputs: focus:ring-2 focus:ring-indigo-500
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const ShoppingBagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const EyeIcon = ({ open }) => open ? (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

// ─── Reusable Input Field ─────────────────────────────────────────────────────

function InputField({ id, label, type, placeholder, value, onChange, icon, rightSlot, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide uppercase">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full pl-9 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 focus:bg-white transition-all duration-200"
          required
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-3 flex items-center">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const auth     = useAuth();
  const navigate = useNavigate();

  // ─── Form Submit Handler ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();   // Prevent default browser form submission
    setError('');          // Clear any previous error
    setLoading(true);      // Disable button, show spinner

    try {
      /**
       * VIVA: What happens here step by step?
       * 1. api.post() calls POST http://localhost:8080/api/auth/login
       * 2. api.js request interceptor adds Content-Type: application/json header
       * 3. Spring Boot receives { email, password } as AuthRequest DTO
       * 4. AuthenticationManager verifies password with BCrypt
       * 5. JwtUtil generates a signed token
       * 6. Response: { token, role, email, fullName }
       */
      const response = await api.post('/auth/login', { email, password });

      // Store token + user info in AuthContext (localStorage + React state)
      auth.login(response.data);

      // Navigate to home page — Navbar will now show logged-in state
      navigate('/');

    } catch (err) {
      /**
       * Error handling:
       * - err.response.data.message → message from our backend JSON error body
       * - Fallback message for network errors (backend not running)
       */
      const msg = err.response?.data?.message
        || 'Unable to connect to the server. Is the backend running?';
      setError(msg);
    } finally {
      setLoading(false); // Always re-enable button
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 flex items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Decorative background blobs */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">

        {/* ── Card ── */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl shadow-indigo-100/50 border border-white/60 p-8 md:p-10">

          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200 mb-4">
              <ShoppingBagIcon />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to your SHOPEase account</p>
          </div>

          {/* ── API Error Alert ──
              Shows the error message from the backend (e.g., "Invalid email or password.")
              styled as a clean rose/red info box above the form fields. */}
          {error && (
            <div
              id="login-error-box"
              className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200"
              role="alert"
            >
              <span className="text-rose-500 mt-0.5 flex-shrink-0">⚠️</span>
              <p className="text-rose-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} id="login-form" className="space-y-4">

            <InputField
              id="login-email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              icon={<MailIcon />}
            />

            <InputField
              id="login-password"
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              icon={<LockIcon />}
              rightSlot={
                <button
                  type="button"
                  id="login-toggle-password"
                  onClick={() => setShowPass(s => !s)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors duration-200"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPass} />
                </button>
              }
            />

            {/* Forgot password */}
            <div className="text-right">
              <a href="#" className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline font-medium">
                Forgot password?
              </a>
            </div>

            {/* Submit Button — disabled with loading state during API call */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                // Loading state: spinner + "Signing in..." text
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-slate-400 bg-white">or</span>
            </div>
          </div>

          {/* Register redirect */}
          <p className="text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              id="login-register-link"
              className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Create one free →
            </Link>
          </p>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-slate-400 mt-5">
          By signing in, you agree to our{' '}
          <a href="#" className="hover:text-indigo-600">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="hover:text-indigo-600">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
