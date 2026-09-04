import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, MessageSquare, Package, User, LogOut, Search, Sprout, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const PublicNavbar = () => {
  const { user, isBuyer, logout } = useAuth();
  const { totalItemsCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLoginClick = () => {
    // Preserve current path so user returns to what they were doing
    navigate('/login', { state: { from: location.pathname } });
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Banner: Marketplace Announcement */}
      <div className="bg-agro-900 text-agro-100 text-xs py-1.5 px-4 text-center font-medium flex justify-center items-center gap-2">
        <Sprout className="w-3.5 h-3.5 text-agro-400" />
        <span>Direct from Farm to Table & Processing Mills — 100% Verified Farmers</span>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-agro-600 to-agro-800 flex items-center justify-center text-white shadow-md shadow-agro-700/20 group-hover:scale-105 transition-transform">
              <Sprout className="w-6 h-6 text-agro-200" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center">
                KISAN<span className="text-agro-600">OVA</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-agro-700 block -mt-1">
                Agri Marketplace
              </span>
            </div>
          </Link>

          {/* Live Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl relative">
            <input
              type="text"
              placeholder="Search wheat, basmati rice, mangoes, organic honey..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/90 border border-slate-200 pl-11 pr-24 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-agro-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-agro-600 hover:bg-agro-700 text-white rounded-full text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
            >
              Search
            </button>
          </form>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-agro-600 transition-colors">
              Home
            </Link>
            <Link to="/products" className="hover:text-agro-600 transition-colors">
              Browse Crops & Produce
            </Link>
          </nav>

          {/* Right Action Icons & Auth */}
          <div className="flex items-center gap-3">
            {/* Multi-Seller Cart Badge */}
            <Link
              to="/cart"
              className="relative p-2.5 rounded-full bg-slate-100 text-slate-700 hover:bg-agro-50 hover:text-agro-700 transition-colors flex items-center justify-center"
              title="View Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-agro-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {totalItemsCount}
                </span>
              )}
            </Link>

            {/* If Buyer logged in */}
            {user && isBuyer ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/orders"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  title="My Orders"
                >
                  <Package className="w-4 h-4 text-agro-600" />
                  <span>My Orders</span>
                </Link>

                <Link
                  to="/chat"
                  className="p-2.5 rounded-full bg-slate-100 text-slate-700 hover:bg-agro-50 hover:text-agro-700 transition-colors"
                  title="Messages & Chat"
                >
                  <MessageSquare className="w-5 h-5" />
                </Link>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-agro-50 hover:bg-agro-100 border border-agro-200 transition-colors text-sm font-medium text-agro-900"
                  >
                    <div className="w-7 h-7 rounded-full bg-agro-600 text-white flex items-center justify-center font-bold text-xs">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline text-xs font-semibold">{user.name.split(' ')[0]}</span>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fadeIn">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Package className="w-4 h-4 text-slate-400" />
                        My Orders
                      </Link>
                      <Link
                        to="/chat"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        Farmer Messages
                      </Link>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                          navigate('/');
                        }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 border-t border-slate-100 mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : user ? (
              // Logged in as Admin or Seller: show logout and portal indicator
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
                  {user.role}
                </span>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs font-medium flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              // Anonymous guest: Sign in / Register buttons
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoginClick}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-agro-700 hover:bg-agro-50 rounded-lg transition-colors"
                >
                  Sign In
                </button>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-agro-600 hover:bg-agro-700 rounded-lg shadow-sm transition-colors"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search wheat, rice, mangoes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 pl-10 pr-20 py-2 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-agro-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-3 bg-agro-600 text-white rounded-full text-xs font-medium"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-800 hover:text-agro-600 py-1"
          >
            Home
          </Link>
          <Link
            to="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-800 hover:text-agro-600 py-1"
          >
            Browse Agricultural Products
          </Link>
          {user && isBuyer && (
            <>
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-slate-800 hover:text-agro-600 py-1"
              >
                My Orders
              </Link>
              <Link
                to="/chat"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-slate-800 hover:text-agro-600 py-1"
              >
                Chat Messages
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;
