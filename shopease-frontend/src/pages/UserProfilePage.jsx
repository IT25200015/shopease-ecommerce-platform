/**
 * UserProfilePage.jsx – SHOPEase User Profile & Address Book
 * =============================================================
 *
 * VIVA DEFENSE:
 * - Restricted to logged-in users (any role).
 * - Manages user profile preferences (smsOptIn, emailOptIn) via UserProfileController.
 * - Manages multiple delivery addresses (CRUD) via AddressController.
 * - Uses toggle switches for notification preferences — a clean UX pattern.
 *
 * Architecture:
 * - The page reads the user's accountID from the AuthContext (derived from JWT).
 * - Since the JWT doesn't store accountID directly, we first fetch the account
 *   by email from /api/accounts/email/{email}, then use the accountID for
 *   all subsequent profile and address operations.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

// ─── Toggle Switch Component ─────────────────────────────────────────────────

function ToggleSwitch({ id, checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-b-0">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-slate-800 cursor-pointer">{label}</label>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          checked ? 'bg-indigo-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function UserProfilePage() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();

  // Account data
  const [accountId, setAccountId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  // Profile preferences
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({ label: '', addressLine: '', city: '', postalCode: '', isDefault: false });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  // Security
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ─── Authorization Check ───
  useEffect(() => {
    if (!isLoggedIn) navigate('/login');
  }, [isLoggedIn, navigate]);

  // ─── Fetch account by email, then load profile & addresses ───
  const loadData = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      // Step 1: Get account by email to obtain accountID
      const accRes = await api.get(`/accounts/email/${user.email}`);
      const acc = accRes.data;
      setAccountId(acc.accountID);
      setEditName(user.fullName || acc.fullName || '');

      // Step 2: Load profile preferences
      try {
        const profileRes = await api.get(`/profiles/account/${acc.accountID}`);
        const p = profileRes.data;
        setProfile(p);
        setPhone(p.phone || '');
        setSmsOptIn(p.smsOptIn ?? false);
        setEmailOptIn(p.emailOptIn ?? true);
      } catch {
        // No profile yet — that's okay, we'll create one on save
        setProfile(null);
      }

      // Step 3: Load addresses
      try {
        const addrRes = await api.get(`/addresses/account/${acc.accountID}`);
        setAddresses(addrRes.data || []);
      } catch {
        setAddresses([]);
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (isLoggedIn && user?.email) loadData();
  }, [isLoggedIn, user?.email, loadData]);

  // ─── Save Profile Preferences ───
  const handleSaveProfile = async () => {
    if (!accountId) return;
    setProfileSaving(true);
    setProfileSuccess('');
    try {
      const payload = {
        phone,
        smsOptIn,
        emailOptIn,
        account: { accountID: accountId }
      };
      if (profile?.profileID) {
        await api.put(`/profiles/${profile.profileID}`, { ...payload, profileID: profile.profileID });
      } else {
        await api.post('/profiles', payload);
      }
      setProfileSuccess('Preferences saved successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
      // Reload to get the latest data
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save preferences.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── Save Account Name ───
  const handleSaveName = async () => {
    if (!accountId) return;
    setNameSaving(true);
    try {
      await api.put('/accounts/me', { fullName: editName });
      user.fullName = editName; // Optimistic update of local user context if possible, usually context re-fetches
      setIsEditingName(false);
      setProfileSuccess('Account info updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update name.');
    } finally {
      setNameSaving(false);
    }
  };

  // ─── Change Password ───
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put('/accounts/password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordSuccess('Password changed successfully.');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // ─── Add Address ───
  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!accountId) return;
    setAddressSaving(true);
    try {
      await api.post('/addresses', {
        ...addressForm,
        account: { accountID: accountId }
      });
      setAddressForm({ label: '', addressLine: '', city: '', postalCode: '', isDefault: false });
      setShowAddressForm(false);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add address.');
    } finally {
      setAddressSaving(false);
    }
  };

  // ─── Delete Address ───
  const handleDeleteAddress = async (addressId) => {
    try {
      await api.delete(`/addresses/${addressId}`);
      await loadData();
    } catch {
      alert('Failed to delete address.');
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200 flex items-center justify-center text-white text-xl font-bold">
            {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Profile Settings</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your preferences and delivery addresses.</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-10 text-center text-slate-400 border border-slate-100 shadow-sm">
            Loading your profile...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* ─── Left Column: Profile & Notifications ─── */}
            <div className="space-y-6">

              {/* Account Info */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Account Information</h2>
                  {!isEditingName && (
                    <button onClick={() => setIsEditingName(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md transition-colors">
                      Edit
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</span>
                    {isEditingName ? (
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button onClick={handleSaveName} disabled={nameSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors">
                          {nameSaving ? '...' : 'Save'}
                        </button>
                        <button onClick={() => { setIsEditingName(false); setEditName(user?.fullName || ''); }} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-lg transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{user?.fullName || '—'}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</span>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{user?.email || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</span>
                    <p className="mt-0.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                        {user?.role?.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Notification Preferences</h2>
                <p className="text-xs text-slate-400 mb-4">Choose how you'd like to receive updates.</p>

                <div>
                  <label htmlFor="profile-phone" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Phone Number</label>
                  <input
                    id="profile-phone"
                    type="tel"
                    placeholder="+94 77 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 focus:bg-white transition-all duration-200 shadow-sm"
                  />
                </div>

                <div className="mt-4">
                  <ToggleSwitch
                    id="toggle-sms"
                    checked={smsOptIn}
                    onChange={setSmsOptIn}
                    label="SMS Notifications"
                    description="Receive order updates and promos via text message."
                  />
                  <ToggleSwitch
                    id="toggle-email"
                    checked={emailOptIn}
                    onChange={setEmailOptIn}
                    label="Email Notifications"
                    description="Receive newsletters and transaction receipts via email."
                  />
                </div>

                {profileSuccess && (
                  <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-500 mt-0.5">✅</span>
                    <p className="text-emerald-700 text-sm font-medium">{profileSuccess}</p>
                  </div>
                )}

                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="mt-5 w-full py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-75"
                >
                  {profileSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>

              {/* Security / Change Password */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Security</h2>
                <p className="text-xs text-slate-400 mb-4">Update your password to keep your account secure.</p>

                {passwordSuccess && (
                  <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-500 mt-0.5">✅</span>
                    <p className="text-emerald-700 text-sm font-medium">{passwordSuccess}</p>
                  </div>
                )}
                {passwordError && (
                  <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-rose-500 mt-0.5">⚠️</span>
                    <p className="text-rose-600 text-sm font-medium">{passwordError}</p>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Current Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 focus:bg-white transition-all duration-200 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 focus:bg-white transition-all duration-200 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 focus:bg-white transition-all duration-200 shadow-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all duration-200 active:scale-95 disabled:opacity-75"
                  >
                    {passwordSaving ? 'Updating...' : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>

            {/* ─── Right Column: Address Book ─── */}
            <div>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Delivery Addresses</h2>
                  <button
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all"
                  >
                    <PlusIcon /> Add New
                  </button>
                </div>

                {/* Add Address Form (collapsible) */}
                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Label</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Home"
                          value={addressForm.label}
                          onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">City</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Colombo"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Address Line</label>
                        <input
                          required
                          type="text"
                          placeholder="123 Main Street, Apt 4B"
                          value={addressForm.addressLine}
                          onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Postal Code</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. 10100"
                          value={addressForm.postalCode}
                          onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="addr-default"
                        type="checkbox"
                        checked={addressForm.isDefault}
                        onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="addr-default" className="text-xs text-slate-600 font-medium">Set as default address</label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={addressSaving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-75"
                      >
                        {addressSaving ? 'Saving...' : 'Save Address'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Address List */}
                {addresses.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="text-4xl block mb-3">📍</span>
                    <p className="text-sm text-slate-500">No saved addresses yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add New" to save your first address.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div key={addr.addressID} className="flex items-start justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-200 group">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                            <MapPinIcon />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-800">{addr.label || 'Address'}</p>
                              {addr.isDefault && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{addr.addressLine}</p>
                            <p className="text-xs text-slate-400">{addr.city}{addr.postalCode ? `, ${addr.postalCode}` : ''}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAddress(addr.addressID)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete address"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
