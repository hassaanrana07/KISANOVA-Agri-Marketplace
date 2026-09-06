import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Plus,
  MessageSquare,
  Truck,
  Compass,
  CreditCard,
  DollarSign,
  BarChart3,
  PieChart
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatPKR } from '../../utils/currency';
import { getSocket } from '../../services/socket';

const SellerDashboardPage = () => {
  const { seller } = useAuth();
  const { t, isRTL } = useLanguage();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/seller/dashboard');
      if (res.data.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Error loading seller dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const socket = getSocket();
    const handleNewOrder = () => {
      fetchDashboard();
    };

    socket.on('new_order', handleNewOrder);
    return () => {
      socket.off('new_order', handleNewOrder);
    };
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || {
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    paidAmount: 0,
    pendingPaymentAmount: 0,
    refunds: 0,
    orderStatusCounts: [],
    paymentStatusCounts: [],
    productCounts: [],
    timelineData: []
  };

  const recentOrders = dashboardData?.recentOrders || [];
  const timeline = metrics.timelineData || [];

  // Find max revenue in timeline for SVG scaling
  const maxTimelineRevenue = Math.max(...timeline.map((t) => parseFloat(t.revenue || 0)), 1000);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-8">
      {/* Top Header & Fast Action CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {seller?.farm_name || t('dashboard.title', 'Farm Dashboard')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {seller?.province || 'Punjab'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('dashboard.subtitle', 'Real-time agricultural order tracking, harvest revenue settlement, and fulfillment metrics in PKR.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/seller/profile"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Compass className="w-4 h-4 text-agro-600" />
            <span>{t('profile.draw_boundary', 'Farm Boundary & GIS')}</span>
          </Link>

          <Link
            to="/seller/products/new"
            className="px-4 py-2 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold shadow-md shadow-agro-600/20 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('action.add_product', 'List Harvest')}</span>
          </Link>
        </div>
      </div>

      {/* 1. Summary Cards Grid (Exact PKR Accounting) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Orders */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('dashboard.total_orders', 'Total Orders')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalOrders}</p>
          <p className="text-[10px] text-slate-400 font-medium">All customer bookings</p>
        </div>

        {/* Pending Orders */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('dashboard.pending_orders', 'Pending Orders')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{metrics.pendingOrders}</p>
          <p className="text-[10px] text-slate-400 font-medium">Awaiting harvest dispatch</p>
        </div>

        {/* Completed Orders */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('dashboard.completed_orders', 'Completed')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">{metrics.completedOrders}</p>
          <p className="text-[10px] text-slate-400 font-medium">Delivered / collected</p>
        </div>

        {/* Total Settled Revenue */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('dashboard.total_revenue', 'Total Revenue')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 truncate">
            {formatPKR(metrics.totalRevenue)}
          </p>
          <p className="text-[10px] text-emerald-700 font-semibold">From settled sales</p>
        </div>

        {/* Paid Amount */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('order.amount_paid', 'Paid Amount')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-teal-700 truncate">
            {formatPKR(metrics.paidAmount)}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Collected via COD / Farm Pickup</p>
        </div>

        {/* Pending Payment Amount */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('dashboard.pending_revenue', 'Pending Pay')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-700 truncate">
            {formatPKR(metrics.pendingPaymentAmount)}
          </p>
          <p className="text-[10px] text-amber-700 font-semibold">Uncollected COD cash</p>
        </div>
      </div>

      {/* 2. Visual Reporting Charts (Orders Over Time & Status Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Orders & Revenue Timeline */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-agro-600" />
              <h3 className="font-bold text-sm text-slate-900">
                {t('dashboard.timeline_title', 'Crop Sales & Orders Timeline')}
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Past 30 Days</span>
          </div>

          {timeline.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <BarChart3 className="w-8 h-8 text-slate-300 mb-1" />
              <p className="text-xs font-semibold text-slate-600">{t('dashboard.no_orders', 'No order dispatch history yet')}</p>
              <p className="text-[11px] text-slate-400">Sales volume will generate automated trend analysis here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-48 flex items-end gap-2 pt-6 px-2">
                {timeline.map((item, idx) => {
                  const rev = parseFloat(item.revenue || 0);
                  const heightPercent = Math.max(12, Math.round((rev / maxTimelineRevenue) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                      {/* Tooltip on Hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        <strong>{formatPKR(rev)}</strong> ({item.orders_count} orders)
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-agro-600 to-emerald-400 rounded-t-lg transition-all group-hover:from-agro-700 group-hover:to-emerald-500 shadow-sm"
                      />

                      {/* Date Label */}
                      <span className="text-[9px] text-slate-400 truncate max-w-full font-mono">
                        {item.date_label.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 px-1">
                <span>Daily Sales Trend</span>
                <span>Values scaled relative to peak revenue</span>
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Order Status Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-agro-600" />
            <h3 className="font-bold text-sm text-slate-900">
              {t('dashboard.status_distribution', 'Fulfillment Status Breakdown')}
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { status: 'PENDING', label: t('status.pending', 'Pending Processing'), color: 'bg-amber-500' },
              { status: 'CONFIRMED', label: t('status.confirmed', 'Confirmed by Farm'), color: 'bg-blue-500' },
              { status: 'SHIPPED', label: t('status.shipped', 'In Transit / Dispatched'), color: 'bg-indigo-500' },
              { status: 'DELIVERED', label: t('status.delivered', 'Delivered to Buyer'), color: 'bg-emerald-500' },
              { status: 'CANCELLED', label: t('status.cancelled', 'Cancelled'), color: 'bg-red-500' }
            ].map((st) => {
              const count = metrics.orderStatusCounts.find((o) => o.status === st.status)?.count || 0;
              const percent = metrics.totalOrders > 0 ? Math.round((count / metrics.totalOrders) * 100) : 0;

              return (
                <div key={st.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                      {st.label}
                    </span>
                    <span className="font-mono text-slate-900">
                      {count} <span className="text-slate-400 font-normal">({percent}%)</span>
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full ${st.color} rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">{t('dashboard.active_products', 'Active Crops')}:</span>
            <span className="font-bold text-slate-800">
              {metrics.productCounts.reduce((acc, p) => acc + p.count, 0)} listings
            </span>
          </div>
        </div>
      </div>

      {/* 3. Recent Orders Table (With PKR and Fulfillment Method) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 text-base">
              {t('dashboard.recent_orders', 'Recent Harvest Orders')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest harvest orders placed by buyers across Pakistan.</p>
          </div>
          <Link
            to="/seller/orders"
            className="text-xs font-bold text-agro-600 hover:text-agro-700 flex items-center gap-1 hover:underline"
          >
            <span>{t('action.view', 'View All Orders')}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {t('dashboard.no_orders', 'No incoming customer orders recorded yet. Active crop listings will display orders here.')}
          </div>
        ) : (
          <>
            {/* Mobile Card Layout (Zero Horizontal Scroll) */}
            <div className="block md:hidden p-4 space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.seller_order_id}
                  className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <span className="font-mono font-black text-xs text-slate-900">
                      {order.order_number}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{order.delivery_name}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Truck className="w-3 h-3 text-agro-600" />
                        {order.fulfillment_method === 'PICKUP'
                          ? t('order.pickup', 'Farm Pickup')
                          : t('order.delivery', 'Courier Delivery')}
                      </p>
                    </div>
                    <div className={isRTL ? 'text-left' : 'text-right'}>
                      <span className="text-sm font-black text-slate-900 block">{formatPKR(order.subtotal)}</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                          order.payment_status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 text-slate-700">
                      {order.seller_status}
                    </span>
                    <Link
                      to={`/seller/orders/${order.seller_order_id}`}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-agro-600 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                    >
                      <span>{t('action.manage', 'Manage')}</span>
                      <ArrowIcon className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block w-full max-w-full overflow-x-auto">
              <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} text-xs text-slate-600`}>
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-6">{t('order.number', 'Order Number')}</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">{t('order.customer', 'Buyer Name')}</th>
                    <th className="py-3 px-6">{t('order.fulfillment', 'Fulfillment')}</th>
                    <th className="py-3 px-6">Payment</th>
                    <th className="py-3 px-6">Subtotal</th>
                    <th className="py-3 px-6">Status</th>
                    <th className={`py-3 px-6 ${isRTL ? 'text-left' : 'text-right'}`}>{t('action.manage', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <tr key={order.seller_order_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {order.order_number}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-800 whitespace-nowrap">
                        {order.delivery_name}
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                          <Truck className="w-3 h-3 text-agro-600" />
                          {order.fulfillment_method === 'PICKUP'
                            ? t('order.pickup', 'Farm Pickup')
                            : t('order.delivery', 'Courier Delivery')}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.payment_status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-bold text-slate-900 whitespace-nowrap">
                        {formatPKR(order.subtotal)}
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {order.seller_status}
                        </span>
                      </td>
                      <td className={`py-3.5 px-6 ${isRTL ? 'text-left' : 'text-right'} whitespace-nowrap`}>
                        <Link
                          to={`/seller/orders/${order.seller_order_id}`}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-agro-600 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                        >
                          <span>{t('action.manage', 'Manage')}</span>
                          <ArrowIcon className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SellerDashboardPage;
