import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Clock, CheckCircle, Truck, AlertCircle, Filter } from 'lucide-react';
import api from '../../services/api';

const SellerOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = '/seller/orders';
      if (statusFilter) url += `?status=${statusFilter}`;
      const res = await api.get(url);
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching seller orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800';
      case 'CONFIRMED':
        return 'bg-indigo-100 text-indigo-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Customer Orders</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Orders placed by buyers containing harvest lots from your farm.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 text-xs rounded-xl px-3 py-2 font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-agro-500"
          >
            <option value="">All Orders</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No orders found matching this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Parent Order #</th>
                  <th className="py-3.5 px-6">Placed On</th>
                  <th className="py-3.5 px-6">Buyer & Recipient</th>
                  <th className="py-3.5 px-6">Destination</th>
                  <th className="py-3.5 px-6">Farm Subtotal</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6">Your Dispatch Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord.seller_order_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-black text-slate-900">
                      {ord.order_number}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(ord.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{ord.delivery_name}</p>
                      <p className="text-[11px] text-slate-400">{ord.delivery_phone}</p>
                    </td>
                    <td className="py-4 px-6 text-slate-600 truncate max-w-xs">
                      {ord.delivery_address}
                    </td>
                    <td className="py-4 px-6 font-black text-slate-900 text-sm">
                      ${parseFloat(ord.subtotal).toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusColor(ord.seller_order_status)}`}>
                        {ord.seller_order_status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/seller/orders/${ord.seller_order_id}`}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-agro-600 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                      >
                        <span>Manage Sub-Order</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerOrdersPage;
