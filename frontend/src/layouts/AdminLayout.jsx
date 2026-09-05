import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
  const { user, isAdmin, logout, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Unified single hamburger state: desktop collapse + mobile drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600"></div>
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

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900">
      {/* Top Header: Unified Light Navbar with Exactly ONE Hamburger Button */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Exactly ONE Hamburger Button */}
          <button
            onClick={handleToggleSidebar}
            className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Toggle Navigation Menu"
            title="Toggle Sidebar"
          >
            {mobileDrawerOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 block leading-none">
                KISANOVA
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mt-0.5">
                Marketplace Administration
              </span>
            </div>
          </Link>
        </div>

        {/* Right Nav Utilities */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right pr-3 border-r border-slate-200">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[150px]">{user?.name}</p>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              System Admin
            </span>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/admin/login');
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body Area: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop Overlay */}
        {mobileDrawerOpen && (
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Clean Light Admin Sidebar */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto h-full bg-white text-slate-700 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out border-r border-slate-200 shadow-2xl md:shadow-none ${
            mobileDrawerOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
          } ${desktopCollapsed ? 'md:w-20' : 'md:w-64'}`}
        >
          {/* Governance Label (Hidden on compact desktop) */}
          {!desktopCollapsed && (
            <div className="px-5 pt-5 pb-2 flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Administration Modules
              </span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center ${desktopCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                    {!desktopCollapsed && <span>{item.label}</span>}
                  </div>
                  {active && !desktopCollapsed && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Version Badge */}
          <div className="p-4 border-t border-slate-200 text-[11px] text-slate-500 flex-shrink-0">
            {!desktopCollapsed ? (
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Kisanova v2.4</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            ) : (
              <div className="text-center font-black text-emerald-700 text-xs">ADM</div>
            )}
          </div>
        </aside>

        {/* Main Content Area - Independently Scrolling */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0 bg-slate-50">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
