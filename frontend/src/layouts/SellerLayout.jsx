import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  ChevronLeft,
  Languages
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationBell from '../components/common/NotificationBell';

const SellerLayout = () => {
  const { user, seller, isSeller, logout, loading } = useAuth();
  const { language, setLanguage, isRTL, dir, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Unified Hamburger State: Controls mobile drawer on <md and sidebar collapse on >=md
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
    { label: t('nav.dashboard', 'Farm Dashboard'), path: '/seller', icon: LayoutDashboard, exact: true },
    { label: t('nav.products', 'Crop Inventory'), path: '/seller/products', icon: Package },
    { label: t('nav.orders', 'Customer Orders'), path: '/seller/orders', icon: ShoppingBag },
    { label: t('nav.messages', 'Buyer Messages'), path: '/seller/messages', icon: MessageSquare },
    { label: t('nav.profile', 'Farm Profile'), path: '/seller/profile', icon: User }
  ];

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const isPending = seller?.approval_status === 'PENDING';

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  return (
    <div
      dir={dir}
      className={`h-screen w-screen flex flex-col overflow-hidden bg-slate-100 text-slate-900 ${
        isRTL ? 'font-urdu rtl' : 'ltr'
      }`}
    >
      {/* Top Navbar */}
      <header className="flex-shrink-0 bg-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between z-30 shadow-md border-b border-slate-800">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Exactly ONE Hamburger Button */}
          <button
            onClick={handleToggleSidebar}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
            aria-label={t('nav.toggle_menu', 'Toggle Navigation Menu')}
            title="Toggle Sidebar"
          >
            {mobileDrawerOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link to="/seller" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-agro-600 flex items-center justify-center text-white shadow-sm">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-none">
                AGRILINK
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-agro-400 block mt-0.5">
                {t('nav.portal_title', 'Seller Portal')}
              </span>
            </div>
          </Link>
        </div>

        {/* Right Nav Utilities: Language Switcher, In-App Notification Bell & Account Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Language Selector: English <-> Urdu */}
          <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                language === 'en'
                  ? 'bg-agro-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to English"
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ur')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                language === 'ur'
                  ? 'bg-agro-600 text-white shadow-xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="اردو میں تبدیل کریں"
            >
              اردو
            </button>
          </div>

          {/* Live In-App Notification Bell */}
          <NotificationBell theme="dark" />

          <div
            className={`hidden sm:block ${
              isRTL ? 'text-left pl-2 border-l' : 'text-right pr-2 border-r'
            } border-slate-800`}
          >
            <p className="text-xs font-bold text-white truncate max-w-[150px]">{seller?.farm_name || user?.name}</p>
            <p className="text-[10px] text-agro-400 font-semibold">
              {seller?.province || t('nav.verified_seller', 'Verified Farmer')}
            </p>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/seller/login');
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title={t('nav.logout', 'Sign Out')}
            aria-label={t('nav.logout', 'Sign Out')}
          >
            <LogOut className={`w-4 h-4 ${isRTL ? '-scale-x-100' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Body Area: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop Overlay */}
        {mobileDrawerOpen && (
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`fixed md:static inset-y-0 ${
            isRTL ? 'right-0 border-l' : 'left-0 border-r'
          } z-50 md:z-auto h-full bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out border-slate-800 shadow-2xl md:shadow-none ${
            mobileDrawerOpen
              ? 'translate-x-0 w-64'
              : isRTL
              ? 'translate-x-full md:translate-x-0'
              : '-translate-x-full md:translate-x-0'
          } ${desktopCollapsed ? 'md:w-20' : 'md:w-64'}`}
        >
          {/* Farm Identity Card (Hidden when desktop is collapsed) */}
          {!desktopCollapsed && (
            <div className="p-4 mx-4 mt-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex-shrink-0">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {t('profile.farm_name', 'Farm / Merchant')}
              </p>
              <p className="font-bold text-white text-xs truncate mt-0.5">{seller?.farm_name || 'My Farm'}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {isPending ? (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    {t('nav.pending_review', 'Pending Review')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    <CheckCircle className="w-3 h-3" />
                    {t('nav.verified_seller', 'Verified Seller')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center ${
                    desktopCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                  } rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-agro-600 text-white shadow-md shadow-agro-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                    {!desktopCollapsed && <span>{item.label}</span>}
                  </div>
                  {active && !desktopCollapsed && (
                    isRTL ? <ChevronLeft className="w-3.5 h-3.5 opacity-80" /> : <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom User Profile */}
          <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex-shrink-0">
            {!desktopCollapsed ? (
              <div className="truncate">
                <p className="font-bold text-slate-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            ) : (
              <div className="text-center font-bold text-white text-xs">AGR</div>
            )}
          </div>
        </aside>

        {/* Main Content Area - Independently Scrolling */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0 bg-slate-100">
          {/* Pending Verification Notice */}
          {isPending && (
            <div className="flex-shrink-0 bg-amber-500 text-slate-950 px-6 py-2.5 font-bold text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>{t('nav.farm_under_review', 'Farm Under Review')}:</strong>{' '}
                  {t(
                    'nav.farm_under_review_desc',
                    'Your seller profile is pending administrative review. Listed crops will be publicly visible upon approval.'
                  )}
                </span>
              </div>
            </div>
          )}

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default SellerLayout;
