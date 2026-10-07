/**
 * CartContext.jsx – SHOPEase Global Cart State (Backend Synced)
 * ==============================================================
 * 
 * VIVA DEFENSE: How does cart sync work?
 * 
 * 1. GUEST USERS (Not Logged In):
 *    - Cart is stored entirely in localStorage.
 *    - Reduces database load for window shoppers.
 * 
 * 2. LOGGED-IN USERS (Authenticated):
 *    - On login (detecting `isLoggedIn`), we fetch the user's saved 
 *      cart from MySQL via `GET /api/cart`.
 *    - When they click "Add to Cart", we update React state immediately 
 *      for snappy UX (Optimistic UI update), and silently send an Axios 
 *      request to `POST /api/cart/add`.
 *    - The interceptor automatically attaches the JWT.
 */

import { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext'; // Import AuthContext to check login status

// --- Helper: Load guest cart from localStorage ---
const loadCartFromStorage = () => {
  try {
    const serialized = localStorage.getItem('shopease_guest_cart');
    return serialized ? JSON.parse(serialized) : [];
  } catch {
    return [];
  }
};

// -------------------------------------------------------
// REDUCER
// -------------------------------------------------------
function cartReducer(state, action) {
  switch (action.type) {
    case 'SET_CART':
      return action.payload; // Completely overwrite state with backend data

    case 'ADD_ITEM': {
      const existing = state.find(item => item.id === action.payload.id);
      if (existing) {
        return state.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...state, { ...action.payload, quantity: action.payload.quantity || 1 }];
    }

    case 'REMOVE_ITEM':
      return state.filter(item => item.id !== action.payload.id);

    case 'INCREMENT':
      return state.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );

    case 'DECREMENT':
      return state.map(item =>
        item.id === action.payload.id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ).filter(item => item.quantity > 0);

    case 'CLEAR_CART':
      return [];

    default:
      return state;
  }
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isLoggedIn } = useAuth(); // Monitor auth state

  const [cartItems, dispatch] = useReducer(
    cartReducer,
    [],
    () => loadCartFromStorage() // Start with guest cart
  );

  // -------------------------------------------------------
  // EFFECT: Fetch Cart on Login
  // -------------------------------------------------------
  useEffect(() => {
    if (isLoggedIn) {
      // User is logged in — fetch their cart from DB
      const fetchDBCart = async () => {
        try {
          const response = await api.get('/cart');

          // Map DB CartItem format to Frontend format
          const formattedCart = response.data.map(item => ({
            id: item?.product?.productID || item?.product?.id || item?.productId || item?.id,
            name: item?.product?.productName || 'Unknown Product',
            brand: item?.product?.brand || 'SHOPEase Seller',
            price: item?.priceAtAddition || 0,
            quantity: item?.quantity || 1,
            imageUrl: item?.product?.imageUrl || null,
            stockQuantity: item?.product?.stockQuantity || 0,
            dbCartItemId: item?.cartItemID
          }));

          dispatch({ type: 'SET_CART', payload: formattedCart });
        } catch (err) {
          console.error("Failed to fetch cart from backend", err);
          dispatch({ type: 'SET_CART', payload: [] });
        }
      };
      fetchDBCart();
    } else {
      // User is logged out — revert to local storage cart
      dispatch({ type: 'SET_CART', payload: loadCartFromStorage() });
    }
  }, [isLoggedIn]);

  // -------------------------------------------------------
  // EFFECT: Persist Guest Cart
  // -------------------------------------------------------
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.setItem('shopease_guest_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isLoggedIn]);

  // Derived values
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // -------------------------------------------------------
  // ACTIONS with Backend Sync
  // -------------------------------------------------------
  const addToCart = async (product) => {
    // 1. Optimistic UI update
    dispatch({ type: 'ADD_ITEM', payload: product });

    // 2. Sync with Backend if logged in
    if (isLoggedIn) {
      try {
        await api.post(`/cart/add?productId=${product.id}&quantity=1`);
        
        // RE-FETCH the cart so we get the newly generated dbCartItemId from MySQL
        const response = await api.get('/cart');
        const formattedCart = response.data.map(item => ({
          id: item?.product?.productID || item?.product?.id || item?.productId || item?.id,
          name: item?.product?.productName || 'Unknown Product',
          brand: item?.product?.brand || 'SHOPEase Seller',
          price: item?.priceAtAddition || 0,
          quantity: item?.quantity || 1,
          imageUrl: item?.product?.imageUrl || null,
          stockQuantity: item?.product?.stockQuantity || 0,
          dbCartItemId: item?.cartItemID
        }));
        dispatch({ type: 'SET_CART', payload: formattedCart });
      } catch (err) {
        console.error("Failed to sync item to backend", err);
      }
    }
  };

  const removeFromCart = async (id) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
    if (isLoggedIn) {
      const item = cartItems.find(i => i.id === id);
      if (item && item.dbCartItemId) {
        try {
          await api.delete(`/cart/items/${item.dbCartItemId}`);
        } catch(err) { console.error("Failed to remove item", err); }
      }
    }
  };

  const incrementItem = async (id) => {
    dispatch({ type: 'INCREMENT', payload: { id } });
    if (isLoggedIn) {
      const item = cartItems.find(i => i.id === id);
      if (item && item.dbCartItemId) {
        try {
          await api.patch(`/cart/items/${item.dbCartItemId}/quantity?value=${item.quantity + 1}`);
        } catch(err) { console.error("Failed to update quantity", err); }
      }
    }
  };

  const decrementItem = async (id) => {
    dispatch({ type: 'DECREMENT', payload: { id } });
    if (isLoggedIn) {
      const item = cartItems.find(i => i.id === id);
      if (item && item.dbCartItemId) {
        if (item.quantity > 1) {
          try {
            await api.patch(`/cart/items/${item.dbCartItemId}/quantity?value=${item.quantity - 1}`);
          } catch(err) { console.error("Failed to update quantity", err); }
        } else {
          try {
            await api.delete(`/cart/items/${item.dbCartItemId}`);
          } catch(err) { console.error("Failed to remove item", err); }
        }
      }
    }
  };

  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const value = {
    cartItems,
    cartCount,
    cartSubtotal,
    addToCart,
    removeFromCart,
    incrementItem,
    decrementItem,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart() must be used inside a <CartProvider>.');
  return context;
}
