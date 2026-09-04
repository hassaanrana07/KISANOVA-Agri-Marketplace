import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SellerLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await login(email, password, 'SELLER');
      if (res.success) {
        navigate('/seller');
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage('Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoSeller = (emailVal, passVal) => {
    setEmail(emailVal);
    setPassword(passVal);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6 text-white">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-agro-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-agro-600/30">
            <Sprout className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Farmer & Seller Portal</h2>
          <p className="text-xs text-slate-400">
            Sign in to manage crop listings, inventory stock, and buyer dispatch orders.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Farmer Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@farm.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-agro-600 hover:bg-agro-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-agro-600/30 transition-colors flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Verifying Farmer...' : 'Access Farm Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Autofill */}
        <div className="pt-4 border-t border-slate-700">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-agro-400" />
            Quick Demo Farmer Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoSeller('seller1@kisanova.com', 'Seller@123456')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold text-left transition-colors"
            >
              Seller 1 (Green Valley)
            </button>
            <button
              type="button"
              onClick={() => fillDemoSeller('seller2@kisanova.com', 'Seller@123456')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold text-left transition-colors"
            >
              Seller 2 (Golden Harvest)
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 pt-2 space-y-2">
          <p>
            New agricultural producer?{' '}
            <Link to="/seller/register" className="font-bold text-agro-400 hover:text-agro-300 underline">
              Apply as a Verified Farmer
            </Link>
          </p>
          <p className="text-[11px] pt-2 border-t border-slate-700 text-slate-500">
            Looking for consumer marketplace?{' '}
            <Link to="/" className="text-slate-300 hover:text-white underline">
              Return to Public Marketplace
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerLoginPage;
