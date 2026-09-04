import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  CheckSquare,
  Package,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
  const { user, isAdmin, logout, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  // Enforce Admin Authentication
  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  const navItems = [
    { label: 'Control Overview', path: '/admin', icon: TrendingUp, exact: true },
    { label: 'Seller Moderation', path: '/admin/sellers', icon: Users },
    { label: 'Product Approvals', path: '/admin/products', icon: Package },
    { label: 'Orders & Payments', path: '/admin/orders', icon: FileText },
    { label: 'User Directory', path: '/admin/users', icon: CheckSquare }
  ];

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm tracking-wider text-white">KISANOVA ADMIN</span>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1 rounded text-slate-400 hover:text-white"
        >
          {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Admin Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-40 transition-transform duration-200 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/10">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-white text-lg tracking-wider">KISANOVA</h1>
            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400">Governance Hub</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4 opacity-75" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile & Sign Out */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/admin/login');
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Admin Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
