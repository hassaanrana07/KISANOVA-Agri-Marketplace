import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, ShieldCheck, Clock, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import api from '../../services/api';
import { formatPKR } from '../../utils/currency';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders');
        if (res.data.success) {
          setOrders(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching buyer orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getPaymentBadge = (status) => {
    if (status === 'PAID') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          PAID
        </span>
      );
    }
    if (status === 'PENDING') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          PENDING
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getOrderBadge = (status) => {
    if (status === 'COMPLETED' || status === 'DELIVERED') {
      return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Completed</span>;
    }
    if (status === 'PROCESSING') {
      return <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Processing</span>;
    }
    return <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Pending Dispatch</span>;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">My Orders</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Track harvest deliveries, multi-farm dispatches, and payment confirmations.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">No Orders Placed Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't placed any harvest orders yet. Browse our verified agricultural marketplace to discover fresh crops.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-agro-600 hover:bg-agro-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse Marketplace</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono font-black text-base text-slate-900">
                    {order.order_number}
                  </span>
                  {getPaymentBadge(order.payment_status)}
                  {getOrderBadge(order.order_status)}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>Placed on: {new Date(order.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Farms Involved: <strong className="text-slate-700">{order.seller_count} Farms</strong></span>
                  <span>•</span>
                  <span>Total Items: <strong className="text-slate-700">{order.total_items_count} units</strong></span>
                </div>

                <p className="text-xs text-slate-600 truncate max-w-md">
                  Delivering to: <strong className="text-slate-800">{order.delivery_name}</strong> ({order.delivery_address})
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="sm:text-right">
                  <span className="text-xs text-slate-400 block">Total Amount</span>
                  <span className="text-2xl font-black text-slate-900">
                    {formatPKR(order.total_amount)}
                  </span>
                </div>

                <Link
                  to={`/orders/${order.id}`}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-agro-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>View Breakdown</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
