import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, Lock, CheckCircle, AlertTriangle, Package } from 'lucide-react';

// ─── Cart Item Row Sub-Component ─────────────────────────────────────────────

function CartItemRow({ item }) {
  const { incrementItem, decrementItem, removeFromCart } = useCart();

  return (
    <div className="group flex items-center gap-4 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow duration-200">
      
      {/* Product image / icon placeholder */}
      <div className="w-24 h-24 min-w-[96px] rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl.split(',')[0]} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-8 h-8 text-slate-400" />
        )}
      </div>

      {/* Product details */}
      <div className="flex-grow min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 truncate">{item.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{item.brand || 'SHOPEase Seller'}</p>
        
        {/* Stock Status Badge */}
        {item.stockQuantity !== undefined && (
          <div className="mt-1.5">
            {item.stockQuantity === 0 ? (
              <span className="text-red-600 text-xs font-medium">Out of Stock</span>
            ) : item.stockQuantity < 5 ? (
              <span className="text-orange-600 text-xs font-medium">Only {item.stockQuantity} left in stock - order soon</span>
            ) : (
              <span className="text-emerald-600 text-xs font-medium">In Stock</span>
            )}
          </div>
        )}

        {/* Mobile: price below name */}
        <p className="text-sm font-bold text-orange-500 mt-1 sm:hidden">
          Rs.{(item.price * item.quantity).toLocaleString()}
        </p>
      </div>

      {/* Quantity stepper */}
      <div className="flex items-center gap-2">
        <button
          id={`cart-dec-${item.id}`}
          onClick={() => decrementItem(item.id)}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors duration-150 hover:scale-110 active:scale-95"
          aria-label="Decrease quantity"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 text-center text-sm font-bold text-slate-900 tabular-nums">
          {item.quantity}
        </span>
        <button
          id={`cart-inc-${item.id}`}
          onClick={() => incrementItem(item.id)}
          disabled={item.stockQuantity !== undefined && item.quantity >= item.stockQuantity}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 ${
            item.stockQuantity !== undefined && item.quantity >= item.stockQuantity
              ? 'bg-slate-50 text-slate-300 opacity-50 cursor-not-allowed'
              : 'bg-slate-100 hover:bg-orange-100 hover:text-orange-500 text-slate-600 hover:scale-110 active:scale-95'
          }`}
          aria-label="Increase quantity"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Price (desktop) */}
      <div className="hidden sm:block text-right min-w-[80px]">
        <p className="text-sm font-bold text-slate-900">Rs.{(item.price * item.quantity).toLocaleString()}</p>
        {item.quantity > 1 && (
          <p className="text-[10px] text-slate-500">Rs.{item.price.toLocaleString()} each</p>
        )}
      </div>

      {/* Delete button — subtle on desktop, visible on hover */}
      <button
        id={`cart-remove-${item.id}`}
        onClick={() => removeFromCart(item.id)}
        className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={`Remove ${item.name} from cart`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Order Summary Card Sub-Component ────────────────────────────────────────

function OrderSummaryCard({ subtotal, clearCart, onCheckout, isCheckingOut, promoCode, setPromoCode, appliedPromo, handleApplyPromo, promoError, validatingPromo }) {
  const TAX_RATE = 0.08; // 8% GST
  const SHIPPING_THRESHOLD = 999;
  const SHIPPING_COST = subtotal >= SHIPPING_THRESHOLD ? 0 : 49;
  const tax = subtotal * TAX_RATE;
  const discount = appliedPromo ? appliedPromo.discountValue : 0;
  const total = Math.max(0, subtotal + tax + SHIPPING_COST - discount);

  const SummaryRow = ({ label, value, isTotal, isSaving }) => (
    <div className={`flex justify-between items-center ${isTotal ? 'pt-3 border-t border-slate-200' : ''}`}>
      <span className={`text-sm ${isTotal ? 'font-bold text-slate-900 text-base' : isSaving ? 'text-green-600' : 'text-slate-500'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${isTotal ? 'text-slate-900 text-base font-extrabold' : isSaving ? 'text-green-600' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl border border-gray-100 p-6 lg:sticky lg:top-24">
      <h2 className="text-lg font-bold text-slate-900 mb-5">Order Summary</h2>

      <div className="space-y-3.5 mb-5">
        <SummaryRow label="Subtotal" value={`Rs.${subtotal.toLocaleString('en-LK', { maximumFractionDigits: 2 })}`} />
        <SummaryRow label="GST (8%)" value={`Rs.${tax.toLocaleString('en-LK', { maximumFractionDigits: 2 })}`} />
        <SummaryRow
          label="Shipping"
          value={SHIPPING_COST === 0 ? 'FREE 🎉' : `Rs.${SHIPPING_COST}`}
          isSaving={SHIPPING_COST === 0}
        />
        {appliedPromo && <SummaryRow label={`Promo: ${appliedPromo.code}`} value={`-Rs.${discount.toFixed(2)}`} isSaving />}
        {SHIPPING_COST > 0 && (
          <p className="text-xs text-slate-400 -mt-1">
            Add Rs.{(SHIPPING_THRESHOLD - subtotal).toFixed(0)} more for free shipping
          </p>
        )}
        <SummaryRow
          label="Total"
          value={`Rs.${total.toLocaleString('en-LK', { maximumFractionDigits: 2 })}`}
          isTotal
        />
      </div>

      {/* Promo Code Section */}
      <div className="mb-6 pt-6 border-t border-slate-200">
        <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Promo Code</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Enter code" 
            value={promoCode}
            onChange={e => setPromoCode(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none uppercase"
          />
          <button 
            onClick={handleApplyPromo}
            disabled={validatingPromo || !promoCode}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Apply
          </button>
        </div>
        {promoError && <p className="text-red-500 text-xs mt-2 font-medium">{promoError}</p>}
        {appliedPromo && <p className="text-green-500 text-xs mt-2 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Promo applied: -Rs.{appliedPromo.discountValue.toFixed(2)}</p>}
      </div>

      {/* Checkout CTA */}
      <button
        id="checkout-btn"
        onClick={onCheckout}
        disabled={isCheckingOut}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
      >
        {isCheckingOut ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Processing...
          </span>
        ) : (
          <><Lock className="w-4 h-4" /> Place Order</>
        )}
      </button>

      {/* Trust badges */}
      <div className="mt-4 flex items-center justify-center gap-3">
        {['🔒 Secure', '↩ Easy Returns', '✅ Verified Sellers'].map(badge => (
          <span key={badge} className="text-[10px] text-slate-500 font-medium">{badge}</span>
        ))}
      </div>

      {/* Clear cart */}
      <button
        id="clear-cart-btn"
        onClick={clearCart}
        disabled={isCheckingOut}
        className="mt-4 w-full text-xs text-slate-400 hover:text-red-500 hover:underline transition-colors duration-200 disabled:opacity-50 disabled:no-underline"
      >
        Clear entire cart
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function CartPage() {
  const { cartItems, cartSubtotal, clearCart } = useCart();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    setPromoError('');
    try {
      const res = await api.get(`/campaigns/validate?code=${promoCode.trim().toUpperCase()}`);
      setAppliedPromo(res.data);
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Invalid promo code');
      setAppliedPromo(null);
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleCheckout = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    // Route to the new secure payment simulator UI
    navigate('/checkout', { state: { promoCode: appliedPromo?.promoCode, discount: appliedPromo?.discountValue } });
  };

  // ── Empty Cart State ──
  if (cartItems.length === 0 && !successMsg) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-4">
            <ShoppingBag className="w-16 h-16 text-slate-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
          <p className="text-slate-500 text-sm mb-6">
            Looks like you haven't added anything yet. Let's change that!
          </p>
          <Link
            to="/products"
            id="cart-empty-shop-btn"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  // ── Success State ──
  if (successMsg) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl border border-gray-100">
          <div className="w-20 h-20 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Confirmed!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Thank you for shopping with SHOPEase. We've received your order and are processing it now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/products"
            id="cart-back-btn"
            className="p-2 rounded-xl text-slate-500 hover:text-orange-500 hover:bg-orange-50 transition-all duration-200"
            aria-label="Back to products"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Cart
            </h1>
            <p className="text-sm text-slate-500">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <p className="text-red-600 text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        {/* ── Main 2-Column Grid Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Cart Items List */}
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map(item => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>

          {/* RIGHT: Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummaryCard 
              subtotal={cartSubtotal} 
              clearCart={clearCart}
              onCheckout={handleCheckout}
              isCheckingOut={isCheckingOut}
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              appliedPromo={appliedPromo}
              handleApplyPromo={handleApplyPromo}
              promoError={promoError}
              validatingPromo={validatingPromo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
