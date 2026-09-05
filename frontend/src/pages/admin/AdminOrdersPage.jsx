import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, Eye, AlertCircle, Building, Search, Filter, Banknote, Truck } from 'lucide-react';
import api from '../../services/api';
import { formatPKR } from '../../utils/currency';

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PARTIALLY_PAID':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Orders & COD Governance</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit platform-wide Cash on Delivery transactions and dispatch progress across Pakistani farms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchOrders();
            }}
            className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search order #, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs text-slate-800 focus:outline-none w-32 sm:w-44 placeholder:text-slate-400"
            />
          </form>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Payments</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
              <option value="PAID">PAID</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Content */}
      {loading ? (
        <div className="py-20 flex items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-sm">
          No orders found matching filter.
        </div>
      ) : (
        <>
          {/* Mobile Cards (Zero Horizontal Scroll) */}
          <div className="block md:hidden space-y-4">
            {orders.map((ord) => (
              <div key={ord.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-mono font-black text-xs text-slate-900">{ord.order_number}</span>
                  <span className="text-[10px] text-slate-400">{new Date(ord.created_at).toLocaleDateString()}</span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900">{ord.buyer_name} ({ord.buyer_email})</p>
                  <p className="text-slate-500 text-[11px]">{ord.delivery_address}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Total Amount</span>
                    <strong className="text-sm font-black text-slate-900">{formatPKR(ord.total_amount)}</strong>
                  </div>
                  <div className="text-right space-y-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPaymentBadge(ord.payment_status)}`}>
                      {ord.payment_status || 'UNPAID'}
                    </span>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">
                      {ord.order_status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Order Reference</th>
                    <th className="py-3.5 px-6">Placed On</th>
                    <th className="py-3.5 px-6">Buyer & Recipient</th>
                    <th className="py-3.5 px-6">Fulfillment</th>
                    <th className="py-3.5 px-6">Total Amount</th>
                    <th className="py-3.5 px-6">COD Status</th>
                    <th className="py-3.5 px-6">Order Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-mono font-black text-slate-900 whitespace-nowrap">
                        {ord.order_number}
                      </td>
                      <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                        {new Date(ord.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{ord.buyer_name}</p>
                        <p className="text-[11px] text-slate-400">{ord.buyer_email}</p>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-[11px]">
                          <Truck className="w-3 h-3 text-emerald-600" />
                          {ord.fulfillment_method === 'PICKUP' ? 'Farm Pickup' : 'Delivery'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-black text-slate-900 whitespace-nowrap">
                        {formatPKR(ord.total_amount)}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getPaymentBadge(ord.payment_status)}`}>
                          {ord.payment_status || 'UNPAID'}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {ord.order_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminOrdersPage;
