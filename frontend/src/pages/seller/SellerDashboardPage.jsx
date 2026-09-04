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
  Plus,
  MessageSquare
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SellerDashboardPage = () => {
  const { seller } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || { totalRevenue: 0, totalOrders: 0, orderStatusCounts: [], productCounts: [] };
  const recentOrders = dashboardData?.recentOrders || [];

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {seller?.farm_name || 'Farm Overview'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track daily crop sales, incoming customer orders, and harvest inventory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/seller/products/new"
            className="px-4 py-2.5 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold shadow-md shadow-agro-600/20 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Crop</span>
          </Link>
          <Link
            to="/seller/messages"
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-agro-600" />
            <span>Inquiries</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settled Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">${metrics.totalRevenue.toFixed(2)}</p>
          <p className="text-[11px] text-emerald-700 font-semibold">From confirmed paid dispatches</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Orders</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalOrders}</p>
          <p className="text-[11px] text-slate-500">Orders containing your crops</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Crop Listings</span>
            <div className="w-8 h-8 rounded-lg bg-agro-50 text-agro-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {metrics.productCounts.reduce((acc, c) => acc + c.count, 0)}
          </p>
          <p className="text-[11px] text-agro-700 font-semibold">
            {metrics.productCounts.find(p => p.status === 'APPROVED')?.count || 0} active in marketplace
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verification Status</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              {seller?.approval_status === 'APPROVED' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4" />}
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">
            {seller?.approval_status === 'APPROVED' ? 'Verified Partner' : 'Pending Audit'}
          </p>
          <p className="text-[11px] text-slate-500">
            {seller?.approval_status === 'APPROVED' ? 'Full marketplace access' : 'Awaiting admin review'}
          </p>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Recent Customer Sub-Orders</h2>
            <p className="text-xs text-slate-500">Orders placed by buyers containing crops from your farm.</p>
          </div>
          <Link to="/seller/orders" className="text-xs font-bold text-agro-600 hover:text-agro-700 flex items-center gap-1">
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No orders received yet. Once buyers order your produce, they will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Order Reference</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Buyer</th>
                  <th className="py-3.5 px-6">Items</th>
                  <th className="py-3.5 px-6">Farm Subtotal</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6">Dispatch Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((ord) => (
                  <tr key={ord.seller_order_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {ord.order_number}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(ord.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900">
                      {ord.delivery_name}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {ord.items_count} units
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      ${parseFloat(ord.subtotal).toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {ord.seller_status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/seller/orders/${ord.seller_order_id}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-agro-50 text-slate-700 hover:text-agro-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Manage
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

export default SellerDashboardPage;
