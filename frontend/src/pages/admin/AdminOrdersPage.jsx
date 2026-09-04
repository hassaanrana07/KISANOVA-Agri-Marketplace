import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Eye, AlertCircle, Building, Search, Filter } from 'lucide-react';
import api from '../../services/api';

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Proof inspection & verification modal
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (paymentFilter) params.set('payment_status', paymentFilter);
      if (search) params.set('search', search);

      const res = await api.get(`/admin/orders?${params.toString()}`);
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [paymentFilter]);

  const handleVerifyPayment = async (isApproved) => {
    if (!selectedPayment) return;
    setVerifying(true);
    try {
      const res = await api.put(`/admin/payments/${selectedPayment.payment_id}/verify`, {
        isApproved,
        adminNotes
      });
      if (res.data.success) {
        setNotice(res.data.message || 'Payment updated.');
        setTimeout(() => setNotice(''), 3000);
        setSelectedPayment(null);
        fetchOrders();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify payment.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Marketplace Orders & Settlements</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Audit buyer payments, inspect bank transfer receipts, and verify cross-farm orders.
        </p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
          {notice}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchOrders();
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search order # or recipient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400 font-medium">Payment State:</span>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Payments</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING (Awaiting Wire)</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No marketplace orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Order Reference</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Buyer</th>
                  <th className="py-3.5 px-6">Involved Farms</th>
                  <th className="py-3.5 px-6">Total Amount</th>
                  <th className="py-3.5 px-6">Gateway / Method</th>
                  <th className="py-3.5 px-6">Payment Status</th>
                  <th className="py-3.5 px-6 text-right">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-black text-white">
                      {ord.order_number}
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(ord.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-white">{ord.buyer_name}</p>
                      <p className="text-[11px] text-slate-400">{ord.buyer_email}</p>
                    </td>
                    <td className="py-4 px-6 text-emerald-400 font-medium">
                      {ord.involved_farms || `${ord.seller_order_count} Farms`}
                    </td>
                    <td className="py-4 px-6 font-black text-white text-sm">
                      ${parseFloat(ord.total_amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 uppercase font-mono text-[11px] text-slate-400">
                      {ord.payment_provider}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.payment_status === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : ord.payment_status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {ord.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {ord.payment_provider === 'bank_transfer' && ord.payment_status === 'PENDING' ? (
                        <button
                          onClick={() => {
                            setSelectedPayment(ord);
                            setAdminNotes('');
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Verify Wire</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Wire Verification Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-white animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Verify Manual Bank Transfer</h3>
              <span className="font-mono text-emerald-400 font-bold text-xs">{selectedPayment.order_number}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction Reference:</span>
                <span className="font-mono font-bold text-white">{selectedPayment.transaction_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Order Amount:</span>
                <span className="font-bold text-emerald-400 text-sm">${parseFloat(selectedPayment.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Buyer Name:</span>
                <span className="font-medium text-white">{selectedPayment.buyer_name} ({selectedPayment.buyer_email})</span>
              </div>

              {selectedPayment.proof_url && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1 font-semibold">Deposit Receipt Uploaded:</span>
                  <div className="rounded-xl overflow-hidden max-h-48 border border-slate-700 bg-black">
                    <img
                      src={selectedPayment.proof_url}
                      alt="Deposit Proof"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => window.open(selectedPayment.proof_url, '_blank')}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Auditor / Clearance Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Bank credit confirmed with reference ID"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerifyPayment(false)}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Reject Payment
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerifyPayment(true)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                {verifying ? 'Settling...' : 'Approve & Mark PAID'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
