import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Sprout, CheckCircle2, AlertCircle, Clock, XCircle, Mail, ArrowRight, Home, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const [status, setStatus] = useState('VERIFYING'); // 'VERIFYING' | 'SUCCESS' | 'ALREADY_VERIFIED' | 'EXPIRED' | 'INVALID'
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('INVALID');
      setMessage(t('verify.missing_token', 'No verification token provided in URL.'));
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.post('/auth/verify-email', { token });
        if (res.data.success) {
          if (res.data.code === 'EMAIL_ALREADY_VERIFIED') {
            setStatus('ALREADY_VERIFIED');
            setMessage(res.data.message || t('verify.already_verified', 'Your email address is already verified.'));
          } else {
            setStatus('SUCCESS');
            setMessage(res.data.message || t('verify.success', 'Email verified successfully! Your account is now active.'));
          }
          if (res.data.email) setEmail(res.data.email);
        }
      } catch (err) {
        const errData = err.response?.data;
        if (errData?.code === 'TOKEN_EXPIRED') {
          setStatus('EXPIRED');
          setMessage(errData.message || t('verify.expired', 'Your verification link has expired (links expire after 30 minutes).'));
          if (errData.email) setResendEmail(errData.email);
        } else if (errData?.code === 'EMAIL_ALREADY_VERIFIED') {
          setStatus('ALREADY_VERIFIED');
          setMessage(errData.message || t('verify.already_verified', 'Your email address is already verified.'));
        } else {
          setStatus('INVALID');
          setMessage(errData?.message || t('verify.invalid', 'This verification link is invalid or has expired.'));
        }
      }
    };

    verifyToken();
  }, [token, t]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendNotice('');
    setResendError('');

    if (!resendEmail.trim()) {
      setResendError(t('verify.enter_email', 'Please enter your account email address.'));
      return;
    }

    setResendLoading(true);
    try {
      const res = await api.post('/auth/resend-verification', { email: resendEmail.trim() });
      if (res.data.success) {
        setResendNotice(t('verify.resend_sent', 'If an account exists with this email, a fresh verification link has been sent.'));
      }
    } catch (err) {
      setResendError(err.response?.data?.message || t('verify.resend_failed', 'Failed to request verification email. Please try again.'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6 text-center">
        {/* Brand Header */}
        <div className="w-12 h-12 rounded-2xl bg-agro-600 text-white flex items-center justify-center mx-auto shadow-md shadow-agro-600/20">
          <Sprout className="w-7 h-7" />
        </div>

        {/* 1. VERIFYING STATE */}
        {status === 'VERIFYING' && (
          <div className="space-y-4 py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-agro-600 border-t-transparent mx-auto"></div>
            <h2 className="text-xl font-black text-slate-900">{t('verify.verifying_title', 'Verifying Email Address')}</h2>
            <p className="text-xs text-slate-500">{t('verify.verifying_sub', 'Please wait while we confirm your security token...')}</p>
          </div>
        )}

        {/* 2. SUCCESS STATE */}
        {status === 'SUCCESS' && (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">{t('verify.success_title', 'Email Verified Successfully!')}</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">{message}</p>
            {email && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                {email}
              </div>
            )}
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full py-3 px-4 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>{t('verify.continue_login', 'Continue to Sign In')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* 3. ALREADY VERIFIED STATE */}
        {status === 'ALREADY_VERIFIED' && (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">{t('verify.already_title', 'Email Already Verified')}</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">{message}</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full py-3 px-4 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>{t('verify.continue_kisanova', 'Continue to Kisanova')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* 4. EXPIRED STATE */}
        {status === 'EXPIRED' && (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">{t('verify.expired_title', 'Verification Link Expired')}</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {message}
            </p>

            {resendNotice ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{resendNotice}</span>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
                {resendError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{resendError}</span>
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {t('verify.account_email', 'Account Email Address')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="farmer@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-agro-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full py-2.5 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  <span>{resendLoading ? t('verify.sending', 'Sending...') : t('verify.send_new_link', 'Send New Verification Email')}</span>
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-slate-100">
              <Link to="/login" className="text-xs font-bold text-slate-600 hover:text-agro-600 transition-colors">
                {t('verify.back_login', 'Back to Sign In')}
              </Link>
            </div>
          </div>
        )}

        {/* 5. INVALID STATE */}
        {status === 'INVALID' && (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">{t('verify.invalid_title', 'Invalid Verification Link')}</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {message}
            </p>

            {resendNotice ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{resendNotice}</span>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
                {resendError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{resendError}</span>
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {t('verify.account_email', 'Account Email Address')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="farmer@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-agro-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full py-2.5 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  <span>{resendLoading ? t('verify.sending', 'Sending...') : t('verify.send_new_link', 'Send New Verification Email')}</span>
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
              <Link to="/" className="hover:text-agro-600 transition-colors flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                <span>{t('verify.home', 'Home')}</span>
              </Link>
              <Link to="/login" className="hover:text-agro-600 transition-colors">
                {t('verify.back_login', 'Sign In')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
