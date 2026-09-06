import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState({ message: '', type: '' });

  const { login, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Target return path (defaults to '/' or previous browsing action, e.g. /cart, /checkout)
  const returnTo = location.state?.from || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsUnverified(false);
    setResendStatus({ message: '', type: '' });

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await login(email.trim(), password, 'BUYER');
      if (res.success) {
        navigate(returnTo, { replace: true });
      } else {
        if (res.isUnverified) {
          setIsUnverified(true);
        }
        setErrorMessage(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMessage('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setResendStatus({ message: 'Please enter your email address.', type: 'error' });
      return;
    }
    setResending(true);
    setResendStatus({ message: '', type: '' });
    try {
      const res = await resendVerification(email.trim());
      if (res.success) {
        setResendStatus({
          message: 'Verification email sent! Please check your inbox and spam folder.',
          type: 'success'
        });
      } else {
        setResendStatus({
          message: res.message || 'Failed to resend verification email.',
          type: 'error'
        });
      }
    } catch (err) {
      setResendStatus({
        message: 'Could not connect to the server to resend email.',
        type: 'error'
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
        {/* Brand Heading */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-agro-600 text-white flex items-center justify-center mx-auto shadow-md shadow-agro-600/20">
            <Sprout className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-widest font-black text-agro-700 block">
              AGRILINK · MARKETPLACE
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-0.5">Buyer Sign In</h2>
          </div>
          <p className="text-xs text-slate-500">
            Sign in to track crop orders, delivery coordinates, and communicate with verified farmers.
          </p>
        </div>

        {/* Unverified Email Warning with Resend Action */}
        {isUnverified ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-800">Email Verification Required</p>
                <p className="text-amber-700 leading-relaxed">
                  Your email has not been verified yet. Please check your inbox for the activation link we sent upon registration.
                </p>
              </div>
            </div>

            {resendStatus.message && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  resendStatus.type === 'success'
                    ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100/80 text-red-800 border border-red-300'
                }`}
              >
                {resendStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{resendStatus.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{resending ? 'Sending Link...' : 'Resend Verification Email'}</span>
            </button>
          </div>
        ) : errorMessage ? (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5" htmlFor="buyer-email">
              Email Address
            </label>
            <div className="relative">
              <input
                id="buyer-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-agro-500 focus:bg-white font-medium transition-all"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700" htmlFor="buyer-password">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-bold text-agro-600 hover:text-agro-700 hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="buyer-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-agro-500 focus:bg-white font-medium transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
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
            className="w-full py-3 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-agro-600/20 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In as Buyer'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Registration link & Farmer portal switch */}
        <div className="text-center space-y-2 pt-2 text-xs text-slate-500 border-t border-slate-100">
          <p>
            Don't have a buyer account?{' '}
            <Link to="/register" className="font-bold text-agro-600 hover:text-agro-700 underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
