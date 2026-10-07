/**
 * CheckoutPage.jsx – SHOPEase Secure Checkout Simulator
 * =======================================================
 * 
 * VIVA DEFENSE:
 * - This page simulates a secure payment gateway (like Stripe).
 * - Implements a 2-step layout for address selection and payment.
 * - Upon submission, it performs THREE sequential API calls (if saving address):
 *   1. (Optional) `POST /api/addresses` to save new address to profile.
 *   2. `POST /api/orders/checkout` to finalize the cart and create the Order.
 *   3. `POST /api/payments/process` to simulate card payment and create a Transaction.
 * - This handles all stock deductions and clears the cart automatically via the backend.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../services/api';
import { Shield, CheckCircle, Download, Plus } from 'lucide-react';

export default function CheckoutPage() {
  const { isLoggedIn, user } = useAuth();
  const { cartSubtotal, cartItems, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const promoCode = location.state?.promoCode || null;
  const discount = location.state?.discount || 0;

  // Global checkout state
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(null);

  // Address state
  const [accountId, setAccountId] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  
  // New address fallback state
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    label: 'Home',
    addressLine: '',
    city: '',
    postalCode: '',
    isDefault: false
  });
  const [saveToProfile, setSaveToProfile] = useState(true);

  // Payment form state
  const [form, setForm] = useState({
    name: '',
    cardNumber: '4242 4242 4242 4242', // Sandbox default
    expiry: '12/26',
    cvc: '123'
  });

  // Calculate total
  const TAX_RATE = 0.08;
  const SHIPPING_COST = cartSubtotal >= 999 ? 0 : 49;
  const total = Math.max(0, cartSubtotal + (cartSubtotal * TAX_RATE) + SHIPPING_COST - discount);

  // ─── Initial Check & Redirect ───
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    } else if (cartItems.length === 0 && !success) {
      navigate('/cart');
    }
  }, [isLoggedIn, cartItems, navigate, success]);

  // ─── Fetch Account and Addresses ───
  const fetchAddressData = useCallback(async () => {
    if (!user?.email) return;
    try {
      setDataLoading(true);
      // 1. Get accountID
      const accRes = await api.get(`/accounts/email/${user.email}`);
      const acc = accRes.data;
      setAccountId(acc.accountID);

      // 2. Fetch addresses
      try {
        const addrRes = await api.get(`/addresses/account/${acc.accountID}`);
        setSavedAddresses(addrRes.data || []);
        if (addrRes.data && addrRes.data.length > 0) {
          // Default to first address
          setSelectedAddressId(addrRes.data[0].addressID);
        } else {
          // Force new address form if no saved addresses exist
          setShowNewAddressForm(true);
        }
      } catch (err) {
        setSavedAddresses([]);
        setShowNewAddressForm(true);
      }
    } catch (err) {
      console.error('Failed to load user data for checkout', err);
    } finally {
      setDataLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (isLoggedIn && user?.email) {
      fetchAddressData();
    }
  }, [isLoggedIn, user?.email, fetchAddressData]);

  // Check if step 1 is complete (valid address provided)
  const isAddressReady = showNewAddressForm 
    ? (newAddressForm.addressLine.trim() !== '' && newAddressForm.city.trim() !== '') 
    : (selectedAddressId !== null);

  // ─── Submit Logic (Confirm & Pay) ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAddressReady) return;
    
    setLoading(true);
    setError('');

    try {
      let finalDeliveryAddressStr = "";

      // ── Step 0: Handle Address (Save if required) ────────────
      if (showNewAddressForm) {
        finalDeliveryAddressStr = `${newAddressForm.label}: ${newAddressForm.addressLine}, ${newAddressForm.city} ${newAddressForm.postalCode}`;
        
        // Save to profile globally if checked
        if (saveToProfile && accountId) {
          try {
            await api.post('/addresses', {
              ...newAddressForm,
              account: { accountID: accountId }
            });
          } catch (addrErr) {
            console.error('Failed to save address globally, continuing with checkout', addrErr);
          }
        }
      } else {
        const selected = savedAddresses.find(a => a.addressID === selectedAddressId);
        if (selected) {
          finalDeliveryAddressStr = `${selected.label}: ${selected.addressLine}, ${selected.city} ${selected.postalCode || ''}`;
        }
      }

      // ── Step 1: Convert Cart to Order (pass promoCode + deliveryAddress) ────────────
      const orderRes = await api.post('/orders/checkout', {
        promoCode: promoCode,
        deliveryAddress: finalDeliveryAddressStr 
      });
      const orderId = orderRes.data.orderID;

      // ── Step 2: Process Sandbox Payment ─────────────────────────────────────
      const paymentRes = await api.post(`/payments/process`, null, {
        params: {
          orderId,
          cardNumber: form.cardNumber.replace(/\s/g, ''),
          expiry: form.expiry,
          cvc: form.cvc
        }
      });

      // Payment successful!
      const transactionId = paymentRes.data.transactionID;

      clearCart();
      setSuccess(true);
      setReceiptUrl(transactionId);

    } catch (err) {
      console.error('❌ Checkout failed', err);
      setError(
        err.response?.data?.message ||
        'Payment processing failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-md p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl border border-gray-100">
          <div className="w-20 h-20 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Your order has been confirmed and is being processed.
          </p>
          <div className="space-y-3">
            {receiptUrl && (
              <button 
                onClick={async () => {
                  try {
                    const response = await api.get(`/payments/receipt/${receiptUrl}`, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `receipt-${receiptUrl}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch (error) {
                    console.error('Error downloading receipt:', error);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
              >
                <Download className="w-4 h-4" /> Download Digital Receipt (PDF)
              </button>
            )}
            <button 
              onClick={() => navigate('/orders')}
              className="w-full py-3 rounded-xl text-sm bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-all"
            >
              View Order History
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 font-bold text-slate-400">Loading checkout...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8 text-slate-900">
          <Shield className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Secure Checkout</h1>
        </div>
        
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-8">
          
          {/* ── STEP 1: Delivery Address ── */}
          <section className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl border border-gray-100 p-6 md:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black">1</span>
              Delivery Address
            </h2>

            {/* Saved Addresses List */}
            {savedAddresses.length > 0 && !showNewAddressForm && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {savedAddresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.addressID;
                  return (
                    <div 
                      key={addr.addressID} 
                      onClick={() => setSelectedAddressId(addr.addressID)}
                      className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-50 shadow-sm' 
                          : 'border-gray-100 bg-white hover:border-orange-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900">{addr.label}</span>
                            {addr.isDefault && <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Default</span>}
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {addr.addressLine}<br />{addr.city}, {addr.postalCode}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add New Address Fallback */}
            {!showNewAddressForm ? (
              <button 
                onClick={() => {
                  setShowNewAddressForm(true);
                  setSelectedAddressId(null);
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add a new delivery address
              </button>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-900">New Address Details</h3>
                  {savedAddresses.length > 0 && (
                    <button 
                      onClick={() => {
                        setShowNewAddressForm(false);
                        setSelectedAddressId(savedAddresses[0]?.addressID);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address Label (e.g., Home, Work)</label>
                      <input 
                        type="text" 
                        value={newAddressForm.label}
                        onChange={e => setNewAddressForm({...newAddressForm, label: e.target.value})}
                        placeholder="Work"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                      <input 
                        type="text" 
                        value={newAddressForm.city}
                        onChange={e => setNewAddressForm({...newAddressForm, city: e.target.value})}
                        placeholder="Colombo"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Street Address</label>
                    <textarea 
                      value={newAddressForm.addressLine}
                      onChange={e => setNewAddressForm({...newAddressForm, addressLine: e.target.value})}
                      placeholder="811, Susil Mawatha..."
                      rows="2"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Postal Code (Optional)</label>
                    <input 
                      type="text" 
                      value={newAddressForm.postalCode}
                      onChange={e => setNewAddressForm({...newAddressForm, postalCode: e.target.value})}
                      placeholder="00100"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" 
                    />
                  </div>
                  
                  <label className="flex items-center gap-3 cursor-pointer mt-2 group w-max">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input 
                        type="checkbox" 
                        checked={saveToProfile}
                        onChange={(e) => setSaveToProfile(e.target.checked)}
                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500/30 checked:border-orange-500 checked:bg-orange-500 cursor-pointer transition-all" 
                      />
                      <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                      Save this address to my profile for future use
                    </span>
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* ── STEP 2: Payment Simulator ── */}
          <section className={`shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl border border-gray-100 p-6 md:p-8 transition-opacity duration-300 ${!isAddressReady ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-colors ${isAddressReady ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>2</span>
              Payment Details
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-8 pb-8 border-b border-gray-100">
                <p className="text-slate-500 text-sm uppercase tracking-widest font-semibold mb-1">Total to Pay</p>
                <p className="text-4xl font-black text-slate-900">Rs.{total.toFixed(2)}</p>
                {promoCode && <p className="text-green-600 text-xs mt-2 font-medium">Promo applied: {promoCode} (-Rs.{discount.toFixed(2)})</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5 uppercase tracking-wider">Name on Card</label>
                <input 
                  required
                  type="text" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5 uppercase tracking-wider">Card Number (Sandbox)</label>
                <input 
                  required
                  type="text" 
                  value={form.cardNumber}
                  onChange={e => setForm({...form, cardNumber: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-mono tracking-wider transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1.5 uppercase tracking-wider">Expiry</label>
                  <input 
                    required
                    type="text" 
                    value={form.expiry}
                    onChange={e => setForm({...form, expiry: e.target.value})}
                    placeholder="MM/YY"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-mono transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1.5 uppercase tracking-wider">CVC</label>
                  <input 
                    required
                    type="password" 
                    value={form.cvc}
                    maxLength="4"
                    onChange={e => setForm({...form, cvc: e.target.value})}
                    placeholder="123"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-mono transition-all" 
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isAddressReady}
                className="w-full py-4 mt-8 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                ) : (
                  `Confirm & Pay Rs.${total.toFixed(2)}`
                )}
              </button>
              
              <p className="text-center text-xs font-medium text-slate-400 mt-4 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> This is a sandbox environment. Do not enter real cards.
              </p>
            </form>
          </section>

        </div>
      </div>
    </div>
  );
}
