import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Lock, Mail, User, Phone, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await register({
        name,
        email,
        phone,
        password,
        role: 'BUYER'
      });

      if (res.success) {
        navigate('/products');
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
