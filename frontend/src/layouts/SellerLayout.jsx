import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MessageSquare,
  User,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Menu,
  X,
  Sprout,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SellerLayout = () => {
  const { user, seller, isSeller, logout, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-400"></div>
      </div>
    );
  }

  // Enforce Seller Authentication
  if (!user || !isSeller) {
    return <Navigate to="/seller/login" state={{ from: location.pathname }} replace />;
  }

  const navItems = [
    { label: 'Farm Dashboard', path: '/seller', icon: LayoutDashboard, exact: true },
    { label: 'Crop Inventory', path: '/seller/products', icon: Package },
    { label: 'Customer Orders', path: '/seller/orders', icon: ShoppingBag },
    { label: 'Buyer Messages', path: '/seller/messages', icon: MessageSquare },
    { label: 'Farm Profile', path: '/seller/profile', icon: User }
  ];

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const isPending = seller?.approval_status === 'PENDING';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-agro-400" />
          <span className="font-bold text-sm tracking-wide">KISANOVA SELLER</span>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1 rounded text-slate-300 hover:text-white"
        >
          {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Seller Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col z-40 transition-transform duration-200 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-agro-600 flex items-center justify-center text-white shadow-md">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-tight">KISANOVA</h1>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-agro-400">Seller Portal</span>
          </div>
        </div>

        {/* Farm Identity Badge */}
        <div className="p-4 mx-4 mt-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <p className="text-xs font-medium text-slate-400">Farm / Business</p>
          <p className="font-bold text-white text-sm truncate">{seller?.farm_name || 'My Farm'}</p>
          <div className="mt-2 flex items-center gap-1.5">
            {isPending ? (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                <AlertTriangle className="w-3 h-3" />
                Pending Verification
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                <CheckCircle className="w-3 h-3" />
                Verified Farmer
              </span>
            )}
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
                    ? 'bg-agro-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4 opacity-80" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Profile & Logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/seller/login');
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Pending Approval Notice Banner */}
        {isPending && (
          <div className="bg-amber-500 text-slate-950 px-6 py-3 font-medium text-xs sm:text-sm flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Farm Verification In Review:</strong> Your seller account is currently pending administrator verification. You may list crops, but they will become public once verified.
              </span>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SellerLayout;
