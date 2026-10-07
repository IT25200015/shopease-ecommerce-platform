/**
 * AuthContext.jsx – SHOPEase Global Authentication State
 * ========================================================
 *
 * VIVA DEFENSE: Why AuthContext instead of prop-drilling or Redux?
 *
 * 1. GLOBAL STATE: The auth state (is the user logged in? what's their role?)
 *    is needed by many components simultaneously:
 *    - Navbar: shows Login or "Welcome, Name" + Logout
 *    - ProductsPage: future "Add Review" button (only logged-in customers)
 *    - CartPage: future "Proceed to Checkout" (must be authenticated)
 *    - Any protected route: must redirect to /login if not authenticated
 *
 * 2. PERSISTENCE: We store the JWT in localStorage so the user stays logged
 *    in across page refreshes. On app load, we hydrate state from localStorage.
 *
 * 3. SEPARATION: Auth logic (login, logout, token management) lives here,
 *    not scattered across individual components.
 *
 * Pattern: Provider + custom hook (same as CartContext) for consistency.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Keys for localStorage — using constants avoids typos
const TOKEN_KEY = 'shopease_jwt_token';
const USER_KEY  = 'shopease_user';

// ─── Context Creation ─────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Helper: Load auth state from localStorage on app start ──────────────────
const loadAuthFromStorage = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user  = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
};

// ─── PROVIDER COMPONENT ───────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  // Hydrate state from localStorage on initial render
  const [token, setToken] = useState(() => loadAuthFromStorage().token);
  const [user,  setUser]  = useState(() => loadAuthFromStorage().user);

  // Derived boolean — cleaner to read in components
  const isLoggedIn = !!token;

  /**
   * login() — called after a successful /api/auth/login or /api/auth/register response.
   *
   * @param {Object} authResponse - The AuthResponse DTO from the backend:
   *   { token, role, email, fullName }
   *
   * VIVA: Why store in localStorage AND state?
   *   - localStorage: survives page refresh (token persists across sessions)
   *   - state: causes React to re-render the UI immediately (Navbar updates)
   *   Both are needed — state alone is lost on refresh, localStorage alone
   *   doesn't trigger re-renders.
   */
  const login = useCallback((authResponse) => {
    const { token, role, email, fullName, accountID } = authResponse;
    const userInfo = { role, email, fullName, accountID };

    // Persist to localStorage for session persistence
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));

    // Update React state → triggers re-render of all consuming components
    setToken(token);
    setUser(userInfo);
  }, []);

  /**
   * logout() — clears both localStorage and React state.
   *
   * VIVA: Since JWT is stateless, "logout" on the client side simply means
   *   deleting the token. The server has no session to invalidate.
   *   For higher security, implement a token blacklist on the server (Redis),
   *   but for this academic project, client-side removal is sufficient.
   */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    token,        // The raw JWT string (used by api.js interceptor)
    user,         // { role, email, fullName }
    isLoggedIn,   // Boolean shorthand
    login,        // Call after successful auth API response
    logout,       // Call on Logout button click
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── CUSTOM HOOK ─────────────────────────────────────────────────────────────

/**
 * useAuth() — provides a guarded API to consume authentication state.
 * Throws a descriptive error if used outside AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() must be used inside an <AuthProvider>. Check your App.jsx wrapping.');
  }
  return context;
}
