import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BankIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

export default function FinanceDashboard() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();

  const [refunds, setRefunds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [processingId, setProcessingId] = useState(null);
  
  // Modal states
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  // Search, Filter, Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'FINANCE_OFFICER') {
      navigate('/');
    }
  }, [isLoggedIn, user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [refundsRes, txRes] = await Promise.all([
        api.get('/refunds/pending'),
        api.get('/transactions')
      ]);
      setRefunds(refundsRes.data || []);
      setTransactions(txRes.data || []);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && user?.role === 'FINANCE_OFFICER') {
      fetchData();
    }
  }, [isLoggedIn, user]);

  // Derived metrics
  const summary = useMemo(() => {
    let revenue = 0;
    let refunded = 0;
    transactions.forEach(tx => {
      if (tx.paymentStatus === 'SUCCESS') revenue += tx.netAmount;
      if (tx.paymentStatus === 'REFUNDED') refunded += tx.netAmount;
    });
    return {
      revenue,
      refunded,
      pendingCount: refunds.length
    };
  }, [transactions, refunds]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchStatus = statusFilter === 'All' || tx.paymentStatus === statusFilter;
      const matchSearch = 
        tx.transactionID?.toString().includes(searchTerm) || 
        (tx.customerName && tx.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [transactions, searchTerm, statusFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['TXN ID', 'Date', 'Customer Name', 'Amount (Rs.)', 'Status'];
    const rows = filteredTransactions.map(tx => [
      tx.transactionID,
      tx.timestamp || 'N/A',
      `"${tx.customerName || 'N/A'}"`, // escape commas in name
      tx.netAmount,
      tx.paymentStatus
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'transactions_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcess = async (status) => {
    if (!selectedRefund) return;
    setProcessingId(selectedRefund.refundID);
    try {
      await api.patch(`/refunds/${selectedRefund.refundID}/process?status=${status}`);
      setRefunds(refunds.filter(r => r.refundID !== selectedRefund.refundID));
      const txRes = await api.get('/transactions');
      setTransactions(txRes.data || []);
      closeModals();
    } catch (err) {
      setError(`Failed to ${status.toLowerCase()} refund.`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleArchive = async (txId) => {
    try {
      await api.patch(`/payments/${txId}/archive`);
      setTransactions(transactions.filter(t => t.transactionID !== txId));
    } catch (err) {
      setError('Failed to archive transaction.');
    }
  };

  const openApproveModal = (refund) => {
    setSelectedRefund(refund);
    setIsApproveModalOpen(true);
  };

  const openDeclineModal = (refund) => {
    setSelectedRefund(refund);
    setIsDeclineModalOpen(true);
    setDeclineReason('');
  };

  const closeModals = () => {
    setIsApproveModalOpen(false);
    setIsDeclineModalOpen(false);
    setSelectedRefund(null);
    setDeclineReason('');
  };

  if (!isLoggedIn || user?.role !== 'FINANCE_OFFICER') return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200 flex items-center justify-center">
            <BankIcon />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Finance Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Manage financial operations, monitor revenue, and process refunds.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-rose-500 mt-0.5">⚠️</span>
            <p className="text-rose-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Revenue</h3>
            <p className="text-3xl font-bold text-slate-900">Rs. {summary.revenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Refunded Amount</h3>
            <p className="text-3xl font-bold text-rose-600">Rs. {summary.refunded.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Pending Refund Requests</h3>
            <p className="text-3xl font-bold text-amber-500">{summary.pendingCount}</p>
          </div>
        </div>

        {/* Pending Refunds Table */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Pending Refund Requests</h2>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Refund ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order/TXN ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (Rs.)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Loading refunds...</td>
                    </tr>
                  ) : refunds.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-slate-400">No pending refunds. 🎉</td>
                    </tr>
                  ) : (
                    refunds.map(refund => (
                      <tr key={refund.refundID} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">#{refund.refundID}</td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-500">#{refund.orderID} / #{refund.transactionID}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{refund.customerName || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">Rs. {refund.amount?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 italic max-w-xs truncate" title={refund.reason}>
                          "{refund.reason}"
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openApproveModal(refund)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-sm font-semibold transition-colors duration-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openDeclineModal(refund)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg text-sm font-semibold transition-colors duration-200"
                          >
                            Decline
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* All Transactions Table */}
        <div className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-bold text-slate-900">All Transactions</h2>
            
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                placeholder="Search TXN ID or Customer..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-64"
              />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="All">All Status</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="PENDING">PENDING</option>
                <option value="REFUNDED">REFUNDED</option>
                <option value="FAILED">FAILED</option>
              </select>
              <button 
                onClick={exportToCSV}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Export CSV
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">TXN ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (Rs.)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Loading transactions...</td>
                    </tr>
                  ) : paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-slate-400">No transactions found.</td>
                    </tr>
                  ) : (
                    paginatedTransactions.map(tx => (
                      <tr key={tx.transactionID} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold font-mono text-slate-900">#{tx.transactionID}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{tx.timestamp || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{tx.customerName || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">Rs. {tx.netAmount?.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            tx.paymentStatus === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                            tx.paymentStatus === 'REFUNDED' ? 'bg-rose-100 text-rose-700' :
                            tx.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {tx.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleArchive(tx.transactionID)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Archive Transaction"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of <span className="font-semibold text-slate-900">{filteredTransactions.length}</span> entries
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      {isApproveModalOpen && selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Approve Refund</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to approve a refund of <span className="font-bold text-slate-900">Rs. {selectedRefund.amount?.toLocaleString()}</span> for Customer: {selectedRefund.customerName}?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={closeModals}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleProcess('APPROVED')}
                disabled={processingId === selectedRefund.refundID}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {processingId === selectedRefund.refundID ? 'Processing...' : 'Approve Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeclineModalOpen && selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Decline Refund</h3>
            <p className="text-slate-600 mb-4">
              You are about to decline the refund of <span className="font-bold text-slate-900">Rs. {selectedRefund.amount?.toLocaleString()}</span> for Customer: {selectedRefund.customerName}.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-1">Decline Reason (Internal)</label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow min-h-[80px]"
                placeholder="Why is this refund being declined?"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={closeModals}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleProcess('REJECTED')}
                disabled={processingId === selectedRefund.refundID || !declineReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {processingId === selectedRefund.refundID ? 'Processing...' : 'Decline Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
