import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Filter,
  Banknote,
  Phone,
  MapPin,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { formatPKR } from '../../utils/currency';

const SellerOrdersPage = () => {
  const { t, isRTL } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleUpdatePaymentStatus = async (sellerOrderId, newPaymentStatus) => {
    setUpdatingId(sellerOrderId);
    setSuccessMessage('');
    try {
      const res = await api.put(`/seller/orders/${sellerOrderId}/payment-status`, {
        payment_status: newPaymentStatus
      });
      if (res.data.success) {
        setOrders((prev) =>
          prev.map((ord) =>
            ord.seller_order_id === sellerOrderId
              ? { ...ord, payment_status: newPaymentStatus }
              : ord
          )
        );
        setSuccessMessage(`Payment status updated to ${newPaymentStatus}`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update payment status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getDispatchBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CONFIRMED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PARTIALLY_PAID':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('nav.orders', 'Customer Orders')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('dashboard.subtitle', 'Incoming orders from buyers with direct Cash on Delivery payment status management.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchOrders}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            title={t('action.refresh', 'Refresh orders')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">{t('action.search', 'Filter')}:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">{t('status.all', 'All Statuses')}</option>
              <option value="PENDING">{t('status.pending', 'Pending')}</option>
              <option value="CONFIRMED">{t('status.confirmed', 'Confirmed')}</option>
              <option value="PROCESSING">{t('status.processing', 'Processing')}</option>
              <option value="SHIPPED">{t('status.shipped', 'Shipped')}</option>
              <option value="DELIVERED">{t('status.delivered', 'Delivered')}</option>
              <option value="CANCELLED">{t('status.cancelled', 'Cancelled')}</option>
            </select>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Orders Content */}
      {loading ? (
        <div className="py-20 flex items-center justify-center bg-white rounded-3xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800">
            {t('order.no_orders', 'No Customer Orders Found')}
          </h3>
          <p className="text-xs text-slate-400">
            {statusFilter ? `No orders found matching the filter "${statusFilter}".` : 'When buyers place harvest orders, they will appear here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Layout: Responsive Cards (Prevents Horizontal Scrolling) */}
          <div className="block md:hidden space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.seller_order_id}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-mono font-black text-xs text-slate-900">
                    {ord.order_number}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(ord.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-900">{ord.delivery_name}</p>
                  <p className="text-slate-500 flex items-center gap-1 text-[11px]">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {ord.delivery_phone}
                  </p>
                  <p className="text-slate-600 flex items-start gap-1 text-[11px] line-clamp-2">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                    {ord.delivery_address}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      {t('order.total_value', 'Farm Subtotal')}
                    </span>
                    <span className="text-sm font-black text-slate-900">{formatPKR(ord.subtotal)}</span>
                  </div>
                  <div className={isRTL ? 'text-left space-y-1' : 'text-right space-y-1'}>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDispatchBadge(ord.seller_order_status)}`}>
                      {ord.seller_order_status}
                    </span>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPaymentBadge(ord.payment_status)}`}>
                        {ord.payment_status || 'UNPAID'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* COD Payment Status Quick Dropdown */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <select
                      value={ord.payment_status || 'UNPAID'}
                      onChange={(e) => handleUpdatePaymentStatus(ord.seller_order_id, e.target.value)}
                      disabled={updatingId === ord.seller_order_id}
                      className="bg-slate-50 border border-slate-200 text-[11px] font-bold rounded-lg px-2 py-1 text-slate-800 w-full focus:ring-1 focus:ring-agro-500"
                    >
                      <option value="UNPAID">{t('status.unpaid', 'UNPAID (Pending Cash)')}</option>
                      <option value="PARTIALLY_PAID">{t('status.partially_paid', 'PARTIALLY PAID')}</option>
                      <option value="PAID">{t('status.paid', 'PAID (Cash Collected)')}</option>
                    </select>
                  </div>

                  <Link
                    to={`/seller/orders/${ord.seller_order_id}`}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-agro-600 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 flex-shrink-0 shadow-sm"
                  >
                    <span>{t('action.manage', 'Manage')}</span>
                    <ArrowIcon className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Layout: Table Container */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="w-full max-w-full overflow-x-auto">
              <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} text-xs`}>
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-5">{t('order.number', 'Order Reference')}</th>
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">{t('order.customer', 'Buyer & Contact')}</th>
                    <th className="py-3.5 px-5">{t('order.address', 'Destination')}</th>
                    <th className="py-3.5 px-5">{t('order.total_value', 'Subtotal')}</th>
                    <th className="py-3.5 px-5">{t('order.dispatch_stage', 'Dispatch Status')}</th>
                    <th className="py-3.5 px-5">{t('order.cod_cash_collection', 'COD Payment Status')}</th>
                    <th className={`py-3.5 px-5 ${isRTL ? 'text-left' : 'text-right'}`}>{t('action.manage', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((ord) => (
                    <tr key={ord.seller_order_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 font-mono font-black text-slate-900 whitespace-nowrap">
                        {ord.order_number}
                      </td>
                      <td className="py-4 px-5 text-slate-500 whitespace-nowrap">
                        {new Date(ord.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-900">{ord.delivery_name}</p>
                        <p className="text-[11px] text-slate-400">{ord.delivery_phone}</p>
                      </td>
                      <td className="py-4 px-5 text-slate-600 max-w-xs truncate" title={ord.delivery_address}>
                        {ord.delivery_address}
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-900 whitespace-nowrap">
                        {formatPKR(ord.subtotal)}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getDispatchBadge(ord.seller_order_status)}`}>
                          {ord.seller_order_status}
                        </span>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <select
                            value={ord.payment_status || 'UNPAID'}
                            onChange={(e) => handleUpdatePaymentStatus(ord.seller_order_id, e.target.value)}
                            disabled={updatingId === ord.seller_order_id}
                            className={`border text-[11px] font-bold rounded-lg px-2.5 py-1 transition-colors cursor-pointer ${getPaymentBadge(ord.payment_status)}`}
                          >
                            <option value="UNPAID">{t('status.unpaid', 'UNPAID (Pending Cash)')}</option>
                            <option value="PARTIALLY_PAID">{t('status.partially_paid', 'PARTIALLY PAID')}</option>
                            <option value="PAID">{t('status.paid', 'PAID (Cash Collected)')}</option>
                          </select>
                        </div>
                      </td>
                      <td className={`py-4 px-5 ${isRTL ? 'text-left' : 'text-right'} whitespace-nowrap`}>
                        <Link
                          to={`/seller/orders/${ord.seller_order_id}`}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-agro-600 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <span>{t('action.manage', 'Manage')}</span>
                          <ArrowIcon className="w-3.5 h-3.5" />
                        </Link>
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

export default SellerOrdersPage;
