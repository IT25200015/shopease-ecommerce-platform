/**
 * OperationsDashboard.jsx – SHOPEase Operations Portal
 * ======================================================
 * 
 * VIVA DEFENSE: 
 * - This dashboard is restricted to the 'OPERATIONS' role.
 * - It fetches all orders to allow comprehensive fulfillment management.
 * - Client-side pagination, search, and filtering implemented for performance.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  Truck,
  DollarSign,
  AlertCircle,
  Eye,
  X
} from 'lucide-react';

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function OperationsDashboard() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const ITEMS_PER_PAGE = 10;

  // ─── Authorization Check ───
  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'OPERATIONS') {
      navigate('/');
    }
  }, [isLoggedIn, user, navigate]);

  // ─── Fetch Orders ───
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data || []);
    } catch (err) {
      setError(`Failed to load orders: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && user?.role === 'OPERATIONS') {
      fetchOrders();
    }
  }, [isLoggedIn, user]);

  // ─── Update Order Status ───
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status?value=${newStatus}`);
      // Update local state
      setOrders(orders.map(o => o.orderID === orderId ? { ...o, orderStatus: newStatus } : o));
      showToast(`Order #${orderId} updated to ${newStatus}`);
    } catch (err) {
      showToast('Failed to update order status.', true);
    } finally {
      setUpdatingId(null);
    }
  };

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Derived Data & Pagination ───

  // Calculate Metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let pendingCount = 0;
    let shippedCount = 0;

    orders.forEach(o => {
      totalRevenue += (o.grossTotal || 0);
      if (o.orderStatus === 'PENDING') pendingCount++;
      if (o.orderStatus === 'SHIPPED') shippedCount++;
    });

    return {
      totalOrders: orders.length,
      pendingCount,
      shippedCount,
      totalRevenue
    };
  }, [orders]);

  // Filtered and Sorted Orders
  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(order => {
      const matchesSearch =
        order.orderID?.toString().includes(searchQuery) ||
        order.customer?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || order.orderStatus === statusFilter;

      // Date filtering
      let matchesDate = true;
      if (dateFilter !== 'ALL' && order.createdAt) {
        const orderDate = new Date(order.createdAt);
        const today = new Date();
        if (dateFilter === 'TODAY') {
          matchesDate = orderDate.toDateString() === today.toDateString();
        } else if (dateFilter === '7DAYS') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          matchesDate = orderDate >= sevenDaysAgo;
        } else if (dateFilter === 'THIS_MONTH') {
          matchesDate = orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    // Sort descending by Order ID (newest first)
    return filtered.sort((a, b) => b.orderID - a.orderID);
  }, [orders, searchQuery, statusFilter, dateFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter]);

  // Paginated Orders
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  if (!isLoggedIn || user?.role !== 'OPERATIONS') return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 relative">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 transition-all animate-in slide-in-from-top-5 duration-300 ${toast.isError ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Quick View Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Order #{selectedOrder.orderID}</h2>
                <p className="text-sm text-slate-500 font-medium mt-0.5">{selectedOrder.createdAt}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Customer Details */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Customer Info</h3>
                  <p className="text-sm font-bold text-slate-800">{selectedOrder.customer?.fullName || 'Guest User'}</p>
                  <p className="text-sm text-slate-600 mt-1">{selectedOrder.customer?.email || 'N/A'}</p>
                  <p className="text-sm text-slate-600 mt-1">{selectedOrder.customer?.phone || 'N/A'}</p>
                </div>

                {/* Shipping Details */}
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Shipping Address</h3>
                  <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">{selectedOrder.deliveryAddress}</p>
                </div>
              </div>

              {/* Order Items */}
              <h3 className="text-sm font-extrabold text-slate-900 mb-4">Ordered Items</h3>
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500">Item</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 text-center">Qty</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.orderItems?.map(item => (
                      <tr key={item.orderItemID}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-800">{item.product?.productName}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-slate-600">x{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                          Rs. {item.unitPrice?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-bold text-slate-500">Gross Total</span>
                <span className="text-xl font-black text-indigo-600">Rs. {selectedOrder.grossTotal?.toLocaleString()}</span>
              </div>

            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-600 shadow-lg shadow-indigo-200 flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Operations Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Manage all orders, shipments, and fulfillments.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-rose-500 mt-0.5">⚠️</span>
            <p className="text-rose-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Orders"
            value={metrics.totalOrders}
            icon={<Package className="w-6 h-6 text-indigo-500" />}
            bg="bg-indigo-50"
          />
          <MetricCard
            title="Action Required"
            value={metrics.pendingCount}
            subtitle="Pending Orders"
            icon={<Clock className="w-6 h-6 text-amber-500" />}
            bg="bg-amber-50"
          />
          <MetricCard
            title="In Transit"
            value={metrics.shippedCount}
            subtitle="Shipped Orders"
            icon={<Truck className="w-6 h-6 text-cyan-500" />}
            bg="bg-cyan-50"
          />
          <MetricCard
            title="Total Revenue"
            value={`Rs. ${metrics.totalRevenue.toLocaleString()}`}
            icon={<DollarSign className="w-6 h-6 text-emerald-500" />}
            bg="bg-emerald-50"
          />
        </div>

        {/* Main Workspace */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Controls Bar (Search & Filters) */}
          <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row gap-4 justify-between items-center bg-slate-50/50">
            {/* Search & Date Filter */}
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              <div className="relative w-full sm:w-80 xl:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Order ID or Customer Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="7DAYS">Last 7 Days</option>
                <option value="THIS_MONTH">This Month</option>
              </select>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2 w-full xl:w-auto">
              {['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-[11px] font-extrabold tracking-widest transition-all ${statusFilter === status
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Order ID</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Total</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="text-slate-400 mt-4 text-sm font-medium">Loading orders...</p>
                    </td>
                  </tr>
                ) : paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No orders found matching your criteria.</p>
                      <button onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }} className="mt-4 text-indigo-600 text-sm font-bold hover:underline">Clear Filters</button>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(order => (
                    <tr key={order.orderID} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> #{order.orderID}
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-semibold text-sm text-slate-800">{order.customer?.fullName || 'Guest'}</span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500 font-medium">
                        {order.createdAt}
                      </td>
                      <td className="px-6 py-5 text-sm font-extrabold text-slate-900">
                        Rs. {order.grossTotal?.toLocaleString()}
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={order.orderStatus} />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <select
                          value={order.orderStatus}
                          onChange={(e) => handleStatusChange(order.orderID, e.target.value)}
                          disabled={updatingId === order.orderID}
                          className={`text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm transition-all ${updatingId === order.orderID ? 'opacity-50 cursor-wait' : 'hover:border-slate-300'}`}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="PROCESSING">Processing</option>
                          <option value="SHIPPED">Shipped</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredOrders.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-sm font-medium text-slate-500 hidden sm:block">
                Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)}</span> of <span className="text-slate-900 font-bold">{filteredOrders.length}</span> entries
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${currentPage === i + 1
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────

function MetricCard({ title, value, subtitle, icon, bg }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 transition-transform hover:-translate-y-1 duration-300">
      <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-[11px] text-slate-500 mt-1 font-bold tracking-wide">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    CONFIRMED: 'bg-orange-100 text-orange-700 border-orange-200',
    PROCESSING: 'bg-blue-100 text-blue-700 border-blue-200',
    SHIPPED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    DELIVERED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  const style = styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border ${style}`}>
      {status}
    </span>
  );
}
