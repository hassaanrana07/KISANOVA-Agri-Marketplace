import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Target return path (defaults to '/' or previous browsing action, e.g. /cart, /checkout, /products/5)
  const returnTo = location.state?.from || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await login(email, password, 'BUYER');
      if (res.success) {
        // Return buyer directly to previous action
        navigate(returnTo, { replace: true });
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage('Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoBuyer = (emailVal, passVal) => {
    setEmail(emailVal);
    setPassword(passVal);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
        {/* Brand Heading */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-agro-600 text-white flex items-center justify-center mx-auto shadow-md shadow-agro-600/20">
            <Sprout className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Welcome Back to Kisanova</h2>
          <p className="text-xs text-slate-500">Sign in to your buyer account to access orders and direct farmer chat.</p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-agro-600/20 transition-colors flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In as Buyer'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials Autofill */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-agro-600" />
            Quick Demo Autofill
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoBuyer('buyer1@kisanova.com', 'Buyer@123456')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold text-left transition-colors"
            >
              Demo Buyer 1
            </button>
            <button
              type="button"
              onClick={() => fillDemoBuyer('buyer2@kisanova.com', 'Buyer@123456')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold text-left transition-colors"
            >
              Demo Buyer 2
            </button>
          </div>
        </div>

        {/* Registration link & Farmer portal switch */}
        <div className="text-center space-y-2 pt-2 text-xs text-slate-500">
          <p>
            Don't have a buyer account?{' '}
            <Link to="/register" className="font-bold text-agro-600 hover:text-agro-700 underline">
              Create an account
            </Link>
          </p>
          <p className="text-[11px] pt-2 border-t border-slate-100">
            Are you an agricultural producer?{' '}
            <Link to="/seller/login" className="font-bold text-slate-800 hover:text-agro-600">
              Go to Farmer / Seller Portal →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
