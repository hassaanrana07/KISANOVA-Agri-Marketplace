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
  CreditCard
} from 'lucide-react';
import api from '../../services/api';

const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
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
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  const pendingSellers = metrics?.sellerStats?.find(s => s.approval_status === 'PENDING')?.count || 0;
  const approvedSellers = metrics?.sellerStats?.find(s => s.approval_status === 'APPROVED')?.count || 0;
  const pendingProducts = metrics?.productStats?.find(p => p.status === 'PENDING')?.count || 0;
  const approvedProducts = metrics?.productStats?.find(p => p.status === 'APPROVED')?.count || 0;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Marketplace Governance Overview</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Monitor multi-farm gross trading volume, review producer verification queues, and audit bank payments.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Marketplace GMV</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">${metrics?.totalGmv?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-emerald-400 font-semibold">{metrics?.totalOrders || 0} paid checkouts</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Farmer Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-white">{approvedSellers}</p>
            {pendingSellers > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold animate-pulse">
                {pendingSellers} Pending
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Audited agricultural producers</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Product Queue</span>
            <div className="w-8 h-8 rounded-lg bg-agro-500/10 text-agro-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-white">{approvedProducts}</p>
            {pendingProducts > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold animate-pulse">
                {pendingProducts} In Queue
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Approved crop listings online</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Bank Wire Audits</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{metrics?.pendingTransfersCount || 0}</p>
          <p className="text-[11px] text-purple-400 font-semibold">Awaiting wire clearance</p>
        </div>
      </div>

      {/* Moderation Fast-Tracks */}
      {(pendingSellers > 0 || pendingProducts > 0 || metrics?.pendingTransfersCount > 0) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Action Items In Verification Queue</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {pendingSellers} seller applications, {pendingProducts} crop lots, and {metrics?.pendingTransfersCount || 0} bank transfers need review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {pendingSellers > 0 && (
              <Link
                to="/admin/sellers"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors"
              >
                Review Sellers ({pendingSellers})
              </Link>
            )}
            {pendingProducts > 0 && (
              <Link
                to="/admin/products"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors"
              >
                Review Crops ({pendingProducts})
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders Across Marketplace */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden space-y-4">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white">Recent Marketplace Orders</h2>
            <p className="text-xs text-slate-400">All cross-seller transactions occurring on Kisanova.</p>
          </div>
          <Link to="/admin/orders" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            <span>All Marketplace Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Order ID</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Buyer Email</th>
                <th className="py-3.5 px-6">Recipient</th>
                <th className="py-3.5 px-6">Farms Involved</th>
                <th className="py-3.5 px-6">Total Amount</th>
                <th className="py-3.5 px-6">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {metrics?.recentOrders?.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-white">
                    {ord.order_number}
                  </td>
                  <td className="py-4 px-6 text-slate-400">
                    {new Date(ord.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-slate-300">
                    {ord.buyer_email}
                  </td>
                  <td className="py-4 px-6 text-slate-300 font-medium">
                    {ord.delivery_name}
                  </td>
                  <td className="py-4 px-6 text-slate-400">
                    {ord.sellers_count} Farms
                  </td>
                  <td className="py-4 px-6 font-black text-white">
                    ${parseFloat(ord.total_amount).toFixed(2)}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ord.payment_status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {ord.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
