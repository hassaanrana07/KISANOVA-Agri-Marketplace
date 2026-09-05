import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SellerLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const isPort5140 = typeof window !== 'undefined' && window.location.port === '5140';
  const dashboardUrl = isPort5140 ? '/' : '/seller';
  const forgotUrl = isPort5140 ? '/forgot-password' : '/seller/forgot-password';
  const registerUrl = isPort5140 ? '/register' : '/seller/register';

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your registered email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await login(email.trim(), password, 'SELLER');
      if (res.success) {
        navigate(dashboardUrl);
      } else {
        setErrorMessage(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMessage('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6 text-white">
        {/* Portal Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-agro-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-agro-600/30">
            <Sprout className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-widest font-black text-agro-400 block">
              AGRILINK
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white mt-0.5">
              Seller Portal
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sign in to manage crop listings, inventory stock, and buyer dispatch orders.
          </p>
        </div>

        {/* Dynamic Alerts */}
        {errorMessage && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
              errorMessage.toLowerCase().includes('under verification') || errorMessage.toLowerCase().includes('pending')
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-red-500/20 border-red-500/40 text-red-300'
            }`}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                {errorMessage.toLowerCase().includes('under verification')
                  ? 'Verification Pending'
                  : errorMessage.toLowerCase().includes('not approved')
                  ? 'Account Not Approved'
                  : 'Authentication Error'}
              </p>
              <p className="font-normal leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Clean Login Form (No demo credentials) */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5" htmlFor="seller-email">
              Email / Phone
            </label>
            <div className="relative">
              <input
                id="seller-email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@domain.com or 03001234567"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium transition-all"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300" htmlFor="seller-password">
                Password
              </label>
              <Link
                to={forgotUrl}
                className="text-[11px] font-bold text-agro-400 hover:text-agro-300 hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="seller-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium transition-all"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-agro-600 hover:bg-agro-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-agro-600/30 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Verifying Credentials...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Secondary Navigation */}
        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-700 space-y-2">
          <p>
            New agricultural producer?{' '}
            <Link to={registerUrl} className="font-bold text-agro-400 hover:text-agro-300 underline">
              Apply as a Verified Farmer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerLoginPage;
