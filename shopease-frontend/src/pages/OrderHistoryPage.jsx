import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Package, Info } from 'lucide-react';

const TrackingTimeline = ({ currentStatus }) => {
  const steps = [
    { key: 'PENDING', label: 'Placed' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'SHIPPED', label: 'Shipped' },
    { key: 'DELIVERED', label: 'Delivered' }
  ];
  
  const statusIndex = steps.findIndex(s => s.key === currentStatus);
  
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-center">
        <span className="text-red-600 font-bold">This order has been cancelled.</span>
      </div>
    );
  }

  return (
    <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-gray-100 w-full">
      <h4 className="text-sm font-bold text-slate-900 mb-6">Tracking Status</h4>
      <div className="relative flex items-center justify-between w-full px-2 sm:px-6">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full z-0"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-orange-500 rounded-full z-0 transition-all duration-500"
          style={{ width: `${Math.max(0, (statusIndex / (steps.length - 1)) * 100)}%` }}
        ></div>
        
        {steps.map((step, index) => {
          const isCompleted = index <= statusIndex;
          const isCurrent = index === statusIndex;
          
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isCompleted 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200/50' 
                    : 'bg-white text-slate-500 border-2 border-gray-200'
                } ${isCurrent ? 'ring-4 ring-orange-100' : ''}`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className={`absolute top-10 text-xs font-semibold whitespace-nowrap ${isCompleted ? 'text-slate-900' : 'text-slate-500'} hidden sm:block`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-12 sm:mt-14 text-sm text-slate-500 bg-white p-4 rounded-xl border border-gray-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-orange-500 flex-shrink-0" />
        <p>
          <strong>Note:</strong> We currently do not have a courier partner or tracking number associated with this order on the backend. 
          This timeline reflects internal processing states.
        </p>
      </div>
    </div>
  );
};

export default function OrderHistoryPage() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundReason, setRefundReason] = useState('');
  const [refundingTxId, setRefundingTxId] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await api.get(`/orders/customer/${user.accountID}`);
        // Sort by newest first
        setOrders(res.data.sort((a, b) => b.orderID - a.orderID));
      } catch (err) {
        console.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [isLoggedIn, user, navigate]);

  const handleRefund = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/refunds/request`, null, {
        params: { transactionId: refundingTxId, reason: refundReason }
      });
      alert('Refund requested successfully. Our Finance team will review it.');
      setRefundingTxId(null);
      setRefundReason('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request refund.');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.post(`/orders/${orderId}/cancel`);
      alert('Order cancelled successfully.');
      setOrders(orders.map(o => o.orderID === orderId ? { ...o, orderStatus: 'CANCELLED' } : o));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-50 text-green-700';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-orange-50 text-orange-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Order History</h1>
            <p className="text-sm text-slate-500">View past orders and download receipts.</p>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-slate-500">Loading orders...</p>
          ) : orders.length === 0 ? (
            <div className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-slate-500">You have no past orders.</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.orderID} className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900">Order #{order.orderID}</h3>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                      Status: 
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${getStatusBadge(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Total: Rs.{order.grossTotal?.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex flex-wrap sm:flex-col sm:items-end gap-2">
                    <button
                      onClick={() => setExpandedOrderId(expandedOrderId === order.orderID ? null : order.orderID)}
                      className="text-sm font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition-colors text-center w-full sm:w-auto"
                    >
                      {expandedOrderId === order.orderID ? 'Hide Tracking' : 'Track Order'}
                    </button>

                    {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.orderStatus) && order.transaction && (
                      <button 
                        onClick={async () => {
                          try {
                            const response = await api.get(`/payments/receipt/${order.transaction.transactionID}`, { responseType: 'blob' });
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `receipt-${order.transaction.transactionID}.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          } catch (error) {
                            console.error('Error downloading receipt:', error);
                          }
                        }}
                        className="text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors text-center w-full sm:w-auto"
                      >
                        Download Receipt
                      </button>
                    )}
                    
                    {['SHIPPED', 'DELIVERED'].includes(order.orderStatus) && order.transaction?.paymentStatus === 'SUCCESS' && (
                      <button 
                        onClick={() => setRefundingTxId(order.transaction.transactionID)}
                        className="text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors w-full sm:w-auto"
                      >
                        Request Refund
                      </button>
                    )}
                    
                    {['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.orderStatus) && (
                      <button 
                        onClick={() => handleCancelOrder(order.orderID)}
                        className="text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors w-full sm:w-auto"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
                
                {expandedOrderId === order.orderID && (
                  <TrackingTimeline currentStatus={order.orderStatus} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {refundingTxId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl border border-gray-100 p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Request Refund</h3>
            <p className="text-sm text-slate-500 mb-4">Please provide a reason for your refund request.</p>
            <form onSubmit={handleRefund}>
              <textarea 
                required
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none mb-4"
                rows="3"
                placeholder="Item was defective..."
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setRefundingTxId(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
