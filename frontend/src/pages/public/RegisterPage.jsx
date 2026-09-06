import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Lock, Mail, User, Phone, ArrowRight, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState({ message: '', type: '' });

  const { register, resendVerification } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await register({
        name,
        email: email.trim(),
        phone,
        password,
        role: 'BUYER'
      });

      if (res.success) {
        setRegisteredSuccess(true);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendStatus({ message: '', type: '' });
    try {
      const res = await resendVerification(email.trim());
      if (res.success) {
        setResendStatus({
          message: 'Verification link resent! Check your inbox.',
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

  if (registeredSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
            <Mail className="w-8 h-8 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] uppercase tracking-widest font-black text-agro-700 block">
              STEP 1: EMAIL VERIFICATION
            </span>
            <h2 className="text-2xl font-black text-slate-900">Check Your Email</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              We've dispatched a secure activation link to:
              <br />
              <strong className="text-slate-900 font-bold">{email}</strong>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Link is active for <strong>30 minutes</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Check your Spam/Junk folder if not received</span>
            </div>
          </div>

          {resendStatus.message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 text-left ${
                resendStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
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

          <div className="space-y-3 pt-2">
            <Link
              to="/login"
              className="w-full py-3 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold shadow-md shadow-agro-600/20 transition-colors flex items-center justify-center gap-2"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-agro-600 text-white flex items-center justify-center mx-auto shadow-md shadow-agro-600/20">
            <Sprout className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Create Buyer Account</h2>
          <p className="text-xs text-slate-500">
            Purchase crops, whole grains, and fresh farm harvests directly from verified growers.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Zainab Ali"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="zainab@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Password *</label>
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
            <span>{loading ? 'Creating Account...' : 'Register Buyer Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center space-y-2 text-xs text-slate-500 pt-2">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-agro-600 hover:text-agro-700 underline">
              Sign in
            </Link>
          </p>
          <p className="text-[11px] pt-2 border-t border-slate-100">
            Want to sell crops as a farmer?{' '}
            <Link to="/seller/register" className="font-bold text-slate-800 hover:text-agro-600">
              Register as Farmer / Seller →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
