/**
 * RegisterPage.jsx – SHOPEase Registration — Wired to Backend
 * =============================================================
 *
 * VIVA: Registration Flow:
 *   1. User fills name, email, password, confirms password, selects role
 *   2. Client-side validation: passwords match, minimum length
 *   3. handleSubmit() → POST /api/auth/register { fullName, email, password, role }
 *   4. Spring Boot AuthController.register():
 *      a. Validates role (CUSTOMER or SHOP_OWNER)
 *      b. Checks email uniqueness
 *      c. BCrypt.encode(password) → saves to DB as passwordHash
 *      d. Auto-creates Cart for CUSTOMER accounts
 *      e. Generates and returns JWT + user info
 *   5a. Success → auth.login(data) → navigate('/') — user is immediately logged in
 *   5b. Failure → error.response.data.message shown in rose error box
 *
 * Role Selector: The "CUSTOMER" / "SHOP_OWNER" toggle maps directly to the
 * backend's role field in the Account entity. This value is embedded in the
 * JWT "role" claim and used for authorization decisions on protected endpoints.
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

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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

// ─── Password Strength Indicator ─────────────────────────────────────────────

function PasswordStrength({ password }) {
  const getStrength = (p) => {
    if (!p) return { score: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 8)          score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[0-9]/.test(p))        score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const map = [
      { label: '',        color: '' },
      { label: 'Weak',    color: 'bg-red-400' },
      { label: 'Fair',    color: 'bg-amber-400' },
      { label: 'Good',    color: 'bg-yellow-400' },
      { label: 'Strong',  color: 'bg-emerald-500' },
    ];
    return { score, ...map[score] };
  };
  const { score, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : 'bg-slate-200'}`} />
        ))}
      </div>
      <p className="text-[11px] text-slate-500">
        Strength: <span className="font-semibold">{label || 'Very weak'}</span>
      </p>
    </div>
  );
}

// ─── Role Selector ────────────────────────────────────────────────────────────

function RoleSelector({ role, setRole }) {
  const roles = [
    { value: 'CUSTOMER',   label: '🛍️ Customer',   desc: 'Shop & discover products' },
    { value: 'SHOP_OWNER', label: '🏪 Shop Owner',  desc: 'List & sell your products' },
  ];
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-2 tracking-wide uppercase">
        I want to join as
      </label>
      <div className="grid grid-cols-2 gap-2">
        {roles.map(({ value, label, desc }) => (
          <button
            key={value}
            type="button"
            id={`role-${value.toLowerCase()}`}
            onClick={() => setRole(value)}
            className={`flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
              role === value
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50'
            }`}
          >
            <span className="text-xl mb-1">{label.split(' ')[0]}</span>
            <span className="text-xs font-semibold">{label.split(' ').slice(1).join(' ')}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{desc}</span>
          </button>
        ))}
      </div>
      {role === 'SHOP_OWNER' && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-1.5">
          <span>💡</span>
          <span>After registration, you'll complete vendor verification before your shop goes live.</span>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [role, setRole]         = useState('CUSTOMER');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const auth     = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // ─── Form Submit Handler ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ── Client-side validation BEFORE hitting the API ──────────────────────
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      /**
       * POST /api/auth/register
       * Body: { fullName, email, password, role }
       * The backend BCrypt-hashes the password before saving.
       * On success, it returns { token, role, email, fullName }.
       */
      const response = await api.post('/auth/register', {
        fullName: form.fullName,
        email:    form.email,
        password: form.password,
        role:     role,           // "CUSTOMER" or "SHOP_OWNER"
      });

      // Auto-login: store the JWT and user info immediately after registration
      auth.login(response.data);

      // Navigate to home — user is now logged in
      navigate('/');

    } catch (err) {
      // Display backend error (e.g., "An account with this email already exists.")
      const msg = err.response?.data?.message
        || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-indigo-50/30 flex items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">

        {/* ── Card ── */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl shadow-indigo-100/50 border border-white/60 p-8 md:p-10">

          {/* Logo / Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200 mb-4">
              <ShoppingBagIcon />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create your account</h1>
            <p className="text-sm text-slate-500 mt-1">Join SHOPEase today — it's free</p>
          </div>

          {/* ── API Error Alert ── */}
          {error && (
            <div
              id="register-error-box"
              className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200"
              role="alert"
            >
              <span className="text-rose-500 mt-0.5 flex-shrink-0">⚠️</span>
              <p className="text-rose-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} id="register-form" className="space-y-4">

            {/* Role Selector — maps to backend Account.role field */}
            <RoleSelector role={role} setRole={setRole} />

            <InputField
              id="register-name"
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={form.fullName}
              onChange={handleChange('fullName')}
              autoComplete="name"
              icon={<UserIcon />}
            />

            <InputField
              id="register-email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange('email')}
              autoComplete="email"
              icon={<MailIcon />}
            />

            <div>
              <InputField
                id="register-password"
                label="Password"
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange('password')}
                autoComplete="new-password"
                icon={<LockIcon />}
                rightSlot={
                  <button
                    type="button"
                    id="register-toggle-password"
                    onClick={() => setShowPass(s => !s)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <EyeIcon open={showPass} />
                  </button>
                }
              />
              <PasswordStrength password={form.password} />
            </div>

            <InputField
              id="register-confirm-password"
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              autoComplete="new-password"
              icon={<LockIcon />}
            />

            {/* Submit Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating Account...
                </span>
              ) : `Create ${role === 'SHOP_OWNER' ? 'Seller' : ''} Account →`}
            </button>
          </form>

          {/* Login redirect */}
          <p className="text-center text-sm text-slate-600 mt-5">
            Already have an account?{' '}
            <Link to="/login" id="register-login-link"
              className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
              Sign in →
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          By registering, you agree to our{' '}
          <a href="#" className="hover:text-indigo-600">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="hover:text-indigo-600">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
