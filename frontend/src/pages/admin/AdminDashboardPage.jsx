import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Package,
  FileText,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Banknote,
  RefreshCw,
  ShoppingBag,
  Clock,
  PieChart,
  BarChart3,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import api from '../../services/api';
import { formatPKR } from '../../utils/currency';

// SVG Palette
const STATUS_COLORS = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  PROCESSING: '#8b5cf6',
  SHIPPED: '#06b6d4',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444'
};

const PAYMENT_COLORS = {
  PAID: '#10b981',
  PARTIALLY_PAID: '#f59e0b',
  UNPAID: '#f43f5e'
};

// 1. Interactive 14-Day Timeline Bar Chart
const TimelineChart = ({ data = [] }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
        <BarChart3 className="w-8 h-8 stroke-1 text-slate-300 mb-1" />
        <p>No order activity recorded in the past 14 days.</p>
      </div>
    );
  }

  const maxOrders = Math.max(...data.map((d) => parseInt(d.orders_count || 0)), 4);
  const chartHeight = 120;
  const chartWidth = 520;
  const barWidth = 22;
  const gap = (chartWidth - data.length * barWidth) / (data.length + 1);

  return (
    <div className="space-y-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`}
          className="w-full h-48 overflow-visible"
        >
          {/* Subtle Grid Lines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = chartHeight - pct * (chartHeight - 15);
            return (
              <g key={idx}>
                <line
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                />
                <text
                  x="0"
                  y={y - 3}
                  className="text-[9px] fill-slate-400 font-semibold"
                >
                  {Math.round(pct * maxOrders)}
                </text>
              </g>
            );
          })}

          {/* Daily Bars */}
          {data.map((item, idx) => {
            const count = parseInt(item.orders_count || 0);
            const height = Math.max((count / maxOrders) * (chartHeight - 20), count > 0 ? 6 : 2);
            const x = gap + idx * (barWidth + gap);
            const y = chartHeight - height;
            const isHovered = hoveredIdx === idx;
            const dateStr = item.date_label ? item.date_label.slice(5) : ''; // MM-DD

            return (
              <g
                key={idx}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Background bar slot */}
                <rect
                  x={x}
                  y={10}
                  width={barWidth}
                  height={chartHeight - 10}
                  rx="4"
                  fill={isHovered ? '#f1f5f9' : 'transparent'}
                />
                {/* Colored value bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx="4"
                  fill={isHovered ? '#059669' : '#10b981'}
                  className="transition-all duration-200"
                />
                {/* Date label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  className={`text-[9px] font-bold ${
                    isHovered ? 'fill-emerald-800 font-black' : 'fill-slate-400'
                  }`}
                >
                  {dateStr}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Floating Details Badge */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="absolute top-0 right-0 bg-slate-900 text-white rounded-xl px-3 py-1.5 text-xs shadow-lg flex items-center gap-3 animate-in fade-in duration-150">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">{data[hoveredIdx].date_label}</p>
              <p className="font-bold text-emerald-400">
                {data[hoveredIdx].orders_count} Order{data[hoveredIdx].orders_count > 1 ? 's' : ''}
              </p>
            </div>
            <div className="border-l border-slate-700 pl-3">
              <p className="text-[10px] text-slate-400 font-medium">Daily Revenue</p>
              <p className="font-bold text-white">{formatPKR(data[hoveredIdx].revenue || 0)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-100">
        <span>14-day history</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
          Daily Orders Volume
        </span>
      </div>
    </div>
  );
};

// 2. Order Status Distribution Donut Chart
const OrderStatusDonut = ({ data = [] }) => {
  const total = data.reduce((sum, d) => sum + parseInt(d.count || 0), 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
        <PieChart className="w-8 h-8 stroke-1 text-slate-300 mb-1" />
        <p>No order status data available.</p>
      </div>
    );
  }

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG Donut */}
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="16"
          />
          {data.map((item, idx) => {
            const count = parseInt(item.count || 0);
            const strokeDash = (count / total) * circumference;
            const strokeOffset = -accumulatedOffset;
            accumulatedOffset += strokeDash;
            const color = STATUS_COLORS[item.status] || '#94a3b8';

            return (
              <circle
                key={idx}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth="16"
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            );
          })}
        </svg>

        {/* Center Total Counter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-black text-slate-900 leading-tight">{total}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total</span>
        </div>
      </div>

      {/* Breakdown Legend */}
      <div className="flex-1 w-full space-y-1.5">
        {data.map((item, idx) => {
          const count = parseInt(item.count || 0);
          const pct = Math.round((count / total) * 100);
          const color = STATUS_COLORS[item.status] || '#94a3b8';

          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-semibold text-slate-700 truncate">{item.status}</span>
              </div>
              <div className="flex items-center gap-2 pl-2">
                <span className="font-bold text-slate-900">{count}</span>
                <span className="text-[10px] text-slate-400 w-8 text-right font-medium">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. COD Payment Status Breakdown
const PaymentStatusChart = ({ data = [] }) => {
  const totalVolume = data.reduce((sum, d) => sum + parseFloat(d.volume || 0), 0);
  const totalCount = data.reduce((sum, d) => sum + parseInt(d.count || 0), 0);

  if (!data || data.length === 0 || totalCount === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
        <DollarSign className="w-8 h-8 stroke-1 text-slate-300 mb-1" />
        <p>No payment status records found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Multi-Segment Stacked Progress Bar */}
      <div className="h-3.5 w-full bg-slate-100 rounded-full flex overflow-hidden">
        {data.map((item, idx) => {
          const count = parseInt(item.count || 0);
          const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
          const color = PAYMENT_COLORS[item.status] || '#94a3b8';

          return (
            <div
              key={idx}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${item.status}: ${count} (${Math.round(pct)}%)`}
              className="h-full transition-all duration-300"
            />
          );
        })}
      </div>

      {/* Cards for each payment status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.map((item, idx) => {
          const count = parseInt(item.count || 0);
          const vol = parseFloat(item.volume || 0);
          const color = PAYMENT_COLORS[item.status] || '#94a3b8';

          return (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  {item.status}
                </span>
              </div>
              <p className="text-sm font-black text-slate-900">{formatPKR(vol)}</p>
              <p className="text-[10px] text-slate-400 font-semibold">{count} order{count !== 1 ? 's' : ''}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 4. Agricultural Crop Category Distribution
const CategoryBarChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
        <Package className="w-8 h-8 stroke-1 text-slate-300 mb-1" />
        <p>No active produce category records.</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => parseInt(b.count || 0) - parseInt(a.count || 0)).slice(0, 5);
  const maxCount = Math.max(...sorted.map((c) => parseInt(c.count || 0)), 1);

  return (
    <div className="space-y-3">
      {sorted.map((item, idx) => {
        const count = parseInt(item.count || 0);
        const pct = Math.round((count / maxCount) * 100);

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">{item.category}</span>
              <span className="text-[11px] font-bold text-slate-500">{count} listing{count !== 1 ? 's' : ''}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/metrics');
      if (res.data.success) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const kpis = metrics?.kpis || {};
  const pendingSellers = kpis.pendingSellers || 0;
  const approvedSellers = kpis.approvedSellers || 0;
  const pendingProducts = kpis.pendingProducts || 0;
  const activeProducts = kpis.activeProducts || 0;

  return (
    <div className="space-y-8 max-w-full overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Marketplace Control Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time analytics for multi-farm trade volume, producer compliance, and order fulfillment.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="self-start sm:self-auto px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 text-xs font-bold"
          title="Refresh Metrics"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 6 REAL KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Gross Trading Volume */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-2 shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Trading Volume</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{formatPKR(kpis.totalRevenue || 0)}</p>
          <p className="text-[11px] text-slate-400 font-semibold">Total marketplace GMV</p>
        </div>

        {/* 2. Cash Collected (Paid Revenue) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-2 shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cash Collected</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">{formatPKR(kpis.paidRevenue || 0)}</p>
          <p className="text-[11px] text-emerald-700 font-bold">Collected cash on delivery</p>
        </div>

        {/* 3. Uncollected COD (Pending) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-2 shadow-xs hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Uncollected COD (Pending)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">{formatPKR(kpis.pendingRevenue || 0)}</p>
          <p className="text-[11px] text-slate-400 font-semibold">Outstanding COD balance</p>
        </div>

        {/* 4. Total Customer Orders */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-2 shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Customer Orders</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.totalOrders || 0}</p>
          <p className="text-[11px] text-blue-700 font-bold">{kpis.deliveredOrders || 0} delivered safely</p>
        </div>

        {/* 5. Registered Farms & Producers */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-2 shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Farms & Producers</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.totalSellers || 0}</p>
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            {pendingSellers > 0 ? (
              <span className="text-amber-600 font-bold">{pendingSellers} awaiting audit</span>
            ) : (
              <span className="text-emerald-700 font-bold">{approvedSellers} fully verified</span>
            )}
          </div>
        </div>

        {/* 6. Registered Buyers */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-2 shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Registered Buyers</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.totalBuyers || 0}</p>
          <p className="text-[11px] text-purple-700 font-bold">{activeProducts} active crops in market</p>
        </div>
      </div>

      {/* 4 GRAPHICAL VISUALIZATIONS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Orders Timeline (Past 14 Days) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Orders & Trade Activity (Past 14 Days)</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Trend</span>
          </div>
          <TimelineChart data={metrics?.ordersTimeline} />
        </div>

        {/* Chart 2: Order Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Order Fulfillment Distribution</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">By Lifecycle</span>
          </div>
          <OrderStatusDonut data={metrics?.orderStatusDistribution} />
        </div>

        {/* Chart 3: Cash on Delivery Payment Status Breakdown */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Cash on Delivery Payment Breakdown</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Ledger</span>
          </div>
          <PaymentStatusChart data={metrics?.paymentStatusDistribution} />
        </div>

        {/* Chart 4: Agricultural Crop Category Distribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Agricultural Category Distribution</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Inventory</span>
          </div>
          <CategoryBarChart data={metrics?.categoryDistribution} />
        </div>
      </div>

      {/* Actionable Review Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Sellers Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Producer Verification Queue</h2>
            </div>
            <Link
              to="/admin/sellers?status=PENDING"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
            >
              <span>View Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {pendingSellers > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-900">
                    {pendingSellers} Pakistani farm profile(s) awaiting identity & land audit.
                  </p>
                  <p className="text-amber-800 mt-0.5">
                    Review administrative jurisdiction, contact phone, and boundary polygon.
                  </p>
                  <Link
                    to="/admin/sellers?status=PENDING"
                    className="inline-block mt-2 font-black text-amber-900 hover:underline"
                  >
                    Open Seller Verification Tool →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-bold text-slate-700">Producer Queue Up-to-Date</p>
                <p>All registered farmers are currently audited and verified.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Overview */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Marketplace Dispatches</h2>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
            >
              <span>All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {metrics?.recentOrders && metrics.recentOrders.length > 0 ? (
              metrics.recentOrders.map((ro) => (
                <div
                  key={ro.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 truncate">
                    <p className="font-black text-slate-900">#{ro.order_number}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {ro.delivery_name} • {new Date(ro.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900">{formatPKR(ro.total_amount)}</p>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        ro.payment_status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ro.payment_status === 'PARTIALLY_PAID'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {ro.payment_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No customer orders placed yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
