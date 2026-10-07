/**
 * Navbar.jsx – SHOPEase Global Navigation with Auth-Aware Rendering
 * ==================================================================
 *
 * Design Choices:
 * - `sticky top-0 z-50 backdrop-blur-md bg-white/80`: Frosted-glass effect
 * - `border-b border-slate-200/60`: Subtle separator line
 * - Active link detection via `useLocation()` from React Router
 * - Mobile hamburger menu with smooth max-height transition
 * - Cart badge: Red dot, animates on increment
 *
 * Auth-Aware Rendering (VIVA KEY CONCEPT):
 *   We consume useAuth() to read { isLoggedIn, user, logout }.
 *
 *   LOGGED OUT:  Shows "Login" text link + "Sign Up" indigo button
 *   LOGGED IN:   Shows sleek user dropdown on desktop
 *
 *   VIVA: Why use conditional rendering instead of two separate Navbars?
 *   React's conditional rendering keeps the component DRY — same structure,
 *   different content based on auth state. The AuthContext re-render propagates
 *   to Navbar automatically when login() or logout() is called.
 * 
 *   NEW FEATURE: Notification Bell for Customers
 *   Fetches unread notifications (like Order Status Updates) in real-time
 *   using useEffect. Shows a badge if there are unread alerts.
 */

import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

import { 
  Search, ShoppingBag as ShoppingBagIcon, Menu as MenuIcon, X as XIcon, 
  User as UserIcon, LogOut as LogOutIcon, ChevronDown, Package, Headset, 
  LayoutDashboard, Activity, DollarSign, Megaphone, ShieldAlert, Bell 
} from 'lucide-react';
import api from '../services/api';

// ─── Navigation link definitions ─────────────────────────────────────────────
const NAV_LINKS = [
  { to: '/',         label: 'Home' },
  { to: '/products', label: 'Products' },
];

// ─── MAIN NAVBAR COMPONENT ───────────────────────────────────────────────────

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { cartCount } = useCart();
  const { isLoggedIn, user, logout } = useAuth();  // ← Auth-aware state
  const location = useLocation();
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const handleSearchChange = (e) => {
    const query = e.target.value;
    if (query) {
      if (location.pathname !== '/products') {
        navigate(`/products?search=${encodeURIComponent(query)}`);
      } else {
        navigate(`/products?search=${encodeURIComponent(query)}`, { replace: true });
      }
    } else {
      if (location.pathname === '/products') {
        navigate(`/products`, { replace: true });
      }
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (isLoggedIn && user?.accountID) {
      // Fetch notifications
      api.get(`/notifications/account/${user.accountID}`)
        .then(res => {
          // Sort newest first
          const sorted = (res.data || []).sort((a, b) => b.notificationId - a.notificationId);
          setNotifications(sorted);
        })
        .catch(err => console.error("Failed to fetch notifications:", err));
    } else {
      setNotifications([]);
    }
  }, [isLoggedIn, user, location.pathname]); // Re-fetch occasionally

  // Add shadow when scrolled for depth
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Logout handler: clear auth state then navigate to home
  const handleLogout = () => {
    logout();        // Clears localStorage + React state
    navigate('/');   // Redirect to home page
  };

  // Active link class helper
  const navLinkClass = ({ isActive }) =>
    `relative text-sm font-medium px-1 py-0.5 transition-colors duration-300 ${
      isActive ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'
    }`;

  return (
    <header
      className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-shadow duration-300 ${
        scrolled ? 'shadow-sm' : ''
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── LOGO ── */}
          <Link to="/" className="flex items-center gap-2.5 group" id="nav-logo">
            <BrandLogo />
            <span className="hidden sm:inline-flex items-center bg-orange-50 text-orange-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-orange-200 tracking-wider uppercase">
              Beta
            </span>
          </Link>

          {/* ── DESKTOP NAV LINKS ── */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={navLinkClass}
                id={`nav-link-${label.toLowerCase()}`}
              >
                {({ isActive }) => (
                  <>
                    {label}
                    <span className={`absolute -bottom-0.5 left-0 h-0.5 bg-orange-500 rounded-full transition-all duration-300 ${isActive ? 'w-full' : 'w-0'}`} />
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* ── SEARCH BAR ── */}
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 text-sm text-gray-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 border border-transparent focus:border-orange-500 transition-all placeholder-gray-400" 
              />
            </div>
          </div>

          {/* ── RIGHT SIDE ACTIONS ── */}
          <div className="flex items-center gap-2 md:gap-3">

            {/* Cart Icon with badge — always visible */}
            <Link
              to="/cart"
              id="nav-cart-btn"
              className="relative p-2 rounded-full hover:bg-gray-100 transition-all text-gray-700"
              aria-label={`Cart with ${cartCount} items`}
            >
              <ShoppingBagIcon className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold shadow-sm animate-bounce border-2 border-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Notification Bell (Logged in users) */}
            {isLoggedIn && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-full hover:bg-gray-100 transition-all text-gray-700"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold shadow-sm border-2 border-white">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden z-50">
                    <div className="p-3 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm">Notifications</span>
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">{notifications.length} New</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm font-medium">No notifications yet.</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.notificationId} className="p-4 border-b border-gray-50 hover:bg-orange-50/50 transition-colors cursor-pointer">
                            <p className="text-sm text-slate-700 font-medium">{n.content}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold">{n.sentAt}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── AUTH-AWARE SECTION ──────────────────────────────────────────
                VIVA: This is where conditional rendering based on auth state happens.
                isLoggedIn comes from AuthContext, which reads from localStorage.
                When auth.login() is called, React re-renders this component
                and the Navbar switches from Login/Register to the user chip.
            ─────────────────────────────────────────────────────────────────── */}
            {isLoggedIn ? (
              /* ── LOGGED IN: User Dropdown ── */
              <div className="relative group hidden md:block">
                {/* Trigger */}
                <button className="flex items-center gap-2 hover:bg-gray-50 p-1 pr-2 rounded-full transition-colors cursor-pointer">
                  <div className="bg-orange-100 text-orange-600 font-bold flex items-center justify-center rounded-full w-9 h-9 text-sm">
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="text-slate-700 font-semibold text-sm">
                    {user?.fullName ? user.fullName.split(' ')[0] : user?.email?.split('@')[0] || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  
                  {user?.role === 'SHOP_OWNER' && (
                    <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-50">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  )}

                  {user?.role === 'OPERATIONS' && (
                    <Link to="/operations" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-50">
                      <Activity className="w-4 h-4" />
                      Ops Panel
                    </Link>
                  )}

                  {user?.role === 'FINANCE_OFFICER' && (
                    <Link to="/finance" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-50">
                      <DollarSign className="w-4 h-4" />
                      Finance Panel
                    </Link>
                  )}

                  {user?.role === 'CUSTOMER' && (
                    <Link to="/orders" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-50">
                      <Package className="w-4 h-4" />
                      My Orders
                    </Link>
                  )}

                  {(user?.role === 'CUSTOMER' || user?.role === 'CUSTOMER_SERVICE' || user?.role === 'SUPPORT_STAFF' || user?.role === 'ADMIN') && (
                    <Link to="/support" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-50">
                      <Headset className="w-4 h-4" />
                      Support Panel
                    </Link>
                  )}

                  {(user?.role === 'MARKETING_EXEC' || user?.role === 'ADMIN') && (
                    <Link to="/marketing" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-50">
                      <Megaphone className="w-4 h-4" />
                      Marketing Panel
                    </Link>
                  )}

                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-50">
                      <ShieldAlert className="w-4 h-4" />
                      Admin Panel
                    </Link>
                  )}

                  <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-gray-50">
                    <UserIcon className="w-4 h-4" />
                    Profile
                  </Link>

                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer text-left">
                    <LogOutIcon className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              /* ── LOGGED OUT: Login link + Sign Up button ── */
              <>
                <Link
                  to="/login"
                  id="nav-login-btn"
                  className="hidden md:flex items-center gap-1.5 p-2 rounded-full hover:bg-gray-100 transition-all text-gray-700 font-medium text-sm"
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="hidden lg:inline">Login</span>
                </Link>
                <Link
                  to="/register"
                  id="nav-register-btn"
                  className="hidden md:inline-flex items-center text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 px-4 py-1.5 rounded-lg shadow-sm shadow-orange-600/30 transition-all duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile hamburger toggle */}
            <button
              id="nav-mobile-menu-btn"
              onClick={() => setMenuOpen(o => !o)}
              className="flex md:hidden items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-all text-gray-700"
              aria-expanded={menuOpen}
              aria-label="Toggle mobile menu"
            >
              {menuOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── MOBILE MENU DRAWER ── */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            menuOpen ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {/* Mobile Search Bar */}
          <div className="px-4 py-3 border-t border-slate-200 bg-white shadow-lg">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder-slate-500 transition-colors" 
              />
            </div>
          </div>
          
          <div className="py-3 pb-4 space-y-1 border-t border-slate-200 bg-white shadow-lg">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                id={`nav-mobile-${label.toLowerCase()}`}
                className={({ isActive }) =>
                  `block px-4 py-2 mx-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? 'text-orange-500 bg-orange-50 font-semibold' : 'text-slate-600 hover:text-orange-500 hover:bg-orange-50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            {/* Mobile auth-aware section */}
            {isLoggedIn ? (
              <>
                {/* Show user info in mobile menu */}
                <div className="px-4 py-3 my-2 mx-4 rounded-lg bg-orange-50 border border-orange-100">
                  <p className="text-xs font-semibold text-orange-900">{user?.fullName || user?.email}</p>
                  <p className="text-[10px] text-orange-500 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</p>
                </div>
                {user?.role === 'CUSTOMER' && (
                  <NavLink
                    to="/orders"
                    className={({ isActive }) =>
                      `block px-4 py-2 mx-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive ? 'text-orange-500 bg-orange-50' : 'text-slate-600 hover:text-orange-500 hover:bg-orange-50'
                      }`
                    }
                  >
                    My Orders
                  </NavLink>
                )}
                {/* Mobile: Profile link */}
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `block px-4 py-2 mx-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? 'text-orange-500 bg-orange-50' : 'text-slate-600 hover:text-orange-500 hover:bg-orange-50'
                    }`
                  }
                >
                  Profile Settings
                </NavLink>
                <button
                  id="nav-mobile-logout"
                  onClick={handleLogout}
                  className="w-full text-left block px-4 py-2 mx-2 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  id="nav-mobile-login"
                  className={({ isActive }) =>
                    `block px-4 py-2 mx-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? 'text-orange-500 bg-orange-50' : 'text-slate-600 hover:text-orange-500 hover:bg-orange-50'
                    }`
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  id="nav-mobile-register"
                  className="block px-4 py-2 mx-4 mt-2 rounded-lg text-sm font-semibold text-center text-white bg-orange-500 hover:bg-orange-600 transition-colors duration-200"
                >
                  Sign Up Free →
                </NavLink>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
