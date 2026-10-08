/**
 * AdminDashboard.jsx – SHOPEase Mall Administrator Portal
 * =========================================================
 * 
 * VIVA DEFENSE: Protected Route Implementation
 * 
 * - This component is restricted to the 'ADMIN' role.
 * - It provides a unified view for managing users and vendor shop registrations.
 * - All mutations (status changes) go through the dedicated AdminController.
 * 
 * Features:
 * 1. User Management: View all registered users with role/status badges.
 *    Actions: Suspend or Activate user accounts.
 * 2. Shop Management: View all shops, especially PENDING_REVIEW ones.
 *    Actions: Approve (set ACTIVE) or Suspend vendor shops.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const StoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>
  </svg>
);

// ─── Status & Role Badge Components ──────────────────────────────────────────

function StatusBadge({ status }) {
  const colors = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    SUSPENDED: 'bg-rose-100 text-rose-700 border-rose-200',
    BANNED: 'bg-red-200 text-red-800 border-red-300',
    PENDING_REVIEW: 'bg-amber-100 text-amber-700 border-amber-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function RoleBadge({ role }) {
  const colors = {
    ADMIN: 'bg-purple-100 text-purple-700',
    CUSTOMER: 'bg-indigo-100 text-indigo-700',
    SHOP_OWNER: 'bg-emerald-100 text-emerald-700',
    FINANCE_OFFICER: 'bg-teal-100 text-teal-700',
    MARKETING: 'bg-fuchsia-100 text-fuchsia-700',
    OPERATIONS: 'bg-cyan-100 text-cyan-700',
    CUSTOMER_SERVICE: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors[role] || 'bg-slate-100 text-slate-600'}`}>
      {role?.replace('_', ' ')}
    </span>
  );
}

// ─── Tab Button ──────────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
        active
          ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
      }`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
          active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // tracks which item is being acted on

  useEffect(() => {
    console.log('Final Shops Array in State:', shops);
  }, [shops]);

  // ─── Authorization Check ───
  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'ADMIN') {
      navigate('/');
    }
  }, [isLoggedIn, user, navigate]);

  // ─── Data Fetching ───
  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      const data = res.data;
      console.log("Admin API Response (Users):", data);
      setUsers(Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []));
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    }
  };

  const fetchShops = async () => {
    try {
      const res = await api.get('/admin/shops');
      const data = res.data;
      console.log("Raw Shops Response: ", data);
      
      // Ensure we extract the array correctly
      if (Array.isArray(data)) {
        setShops(data);
      } else if (data && Array.isArray(data.content)) {
        setShops(data.content);
      } else if (data && Array.isArray(data.data)) {
        setShops(data.data);
      } else {
        console.warn("Unexpected shop data format:", data);
      }
    } catch (err) {
      console.error('Failed to load shops:', err);
      // Removed setShops([]) to avoid silently clearing existing state on minor errors
    }
  };

  useEffect(() => {
    if (isLoggedIn && user?.role === 'ADMIN') {
      setLoading(true);
      Promise.allSettled([fetchUsers(), fetchShops()]).finally(() => setLoading(false));
    }
  }, [isLoggedIn, user]);

  // ─── Actions ───
  const handleUserStatusChange = async (accountId, newStatus) => {
    setActionLoading(`user-${accountId}`);
    try {
      await api.put(`/admin/users/${accountId}/status`, { status: newStatus });
      await fetchUsers();
    } catch (err) {
      alert('Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleShopStatusChange = async (shopId, newStatus) => {
    setActionLoading(`shop-${shopId}`);
    try {
      await api.put(`/admin/shops/${shopId}/status`, { status: newStatus });
      await fetchShops();
    } catch (err) {
      console.error('Failed to update shop status:', err.response?.data || err.message);
      alert('Failed to update shop status.');
    } finally {
      setActionLoading(null);
    }
  };

  // Prevent flash of content before redirect
  if (!isLoggedIn || user?.role !== 'ADMIN') return null;

  const safeUsers = Array.isArray(users) ? users : [];
  const safeShops = Array.isArray(shops) ? shops : [];

  // Sort users hierarchically by role: ADMIN -> SHOP_OWNER -> CUSTOMER -> OTHERS
  const rolePriority = {
    'ADMIN': 1,
    'SHOP_OWNER': 2,
    'CUSTOMER': 3
  };

  const sortedUsers = [...safeUsers].sort((a, b) => {
    const priorityA = rolePriority[a.role] || 99;
    const priorityB = rolePriority[b.role] || 99;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Fallback sort by ID
    return a.accountID - b.accountID;
  });

  const pendingShops = safeShops.filter(s => s.status === 'PENDING_REVIEW' || s.status === 'PENDING');

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-200 flex items-center justify-center">
            <ShieldIcon />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Manage users, approve vendors, and oversee the platform.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-xs font-bold text-indigo-600 tracking-widest uppercase">Total Users</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{safeUsers.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-xs font-bold text-emerald-600 tracking-widest uppercase">Active Shops</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{safeShops.filter(s => s.status === 'ACTIVE').length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-xs font-bold text-amber-600 tracking-widest uppercase">Pending Approval</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{pendingShops.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-xs font-bold text-rose-600 tracking-widest uppercase">Suspended Users</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{safeUsers.filter(u => u.status === 'SUSPENDED').length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-xs font-bold text-red-600 tracking-widest uppercase">Suspended Shops</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{safeShops.filter(s => s.status === 'SUSPENDED').length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit mb-6">
          <TabButton
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            icon={<UsersIcon />}
            label="All Users"
            count={safeUsers.length}
          />
          <TabButton
            active={activeTab === 'shops'}
            onClick={() => setActiveTab('shops')}
            icon={<StoreIcon />}
            label="Shop Registrations"
            count={safeShops.length}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-3xl p-10 text-center text-slate-400 border border-slate-100 shadow-sm">
            Loading data...
          </div>
        ) : activeTab === 'users' ? (
          /* ─── Users Table ─── */
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Registered Users</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedUsers.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No users found.</td></tr>
                  ) : (
                    sortedUsers.map(u => (
                      <tr key={u.accountID} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-slate-500">#{u.accountID}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{u.fullName}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                        <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                        <td className="px-6 py-4"><StatusBadge status={u.status} /></td>
                        <td className="px-6 py-4">
                          {u.role !== 'ADMIN' && (
                            u.status === 'ACTIVE' ? (
                              <button
                                onClick={() => handleUserStatusChange(u.accountID, 'SUSPENDED')}
                                disabled={actionLoading === `user-${u.accountID}`}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all disabled:opacity-50"
                              >
                                {actionLoading === `user-${u.accountID}` ? '...' : 'Suspend'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUserStatusChange(u.accountID, 'ACTIVE')}
                                disabled={actionLoading === `user-${u.accountID}`}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all disabled:opacity-50"
                              >
                                {actionLoading === `user-${u.accountID}` ? '...' : 'Activate'}
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ─── Shops Table ─── */
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">All Shop Registrations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Shop Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeShops.length === 0 ? (
                    <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">No shops found.</td></tr>
                  ) : (
                    safeShops.map(s => (
                      <tr key={s.shopId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-slate-500">#{s.shopId}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{s.shopName}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{s.description || '—'}</td>
                        <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                        <td className="px-6 py-4 flex gap-2">
                          {s.status !== 'ACTIVE' && (
                            <button
                              onClick={() => handleShopStatusChange(s.shopId, 'ACTIVE')}
                              disabled={actionLoading === `shop-${s.shopId}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all disabled:opacity-50"
                            >
                              {actionLoading === `shop-${s.shopId}` ? '...' : 'Approve'}
                            </button>
                          )}
                          {s.status !== 'SUSPENDED' && (
                            <button
                              onClick={() => handleShopStatusChange(s.shopId, 'SUSPENDED')}
                              disabled={actionLoading === `shop-${s.shopId}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all disabled:opacity-50"
                            >
                              {actionLoading === `shop-${s.shopId}` ? '...' : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
