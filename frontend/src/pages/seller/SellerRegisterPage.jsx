import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Lock, Mail, User, Phone, MapPin, Building, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SellerRegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [farmName, setFarmName] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);

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
        role: 'SELLER',
        farm_name: farmName,
        address,
        bio
      });

      if (res.success) {
        setSuccessNotice(true);
        setTimeout(() => {
          navigate('/seller');
        }, 2000);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage('Farmer registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6 text-white">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-agro-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-agro-600/30">
            <Sprout className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Farmer / Cooperative Application</h2>
          <p className="text-xs text-slate-400">
            Apply to list agricultural produce directly. New applications receive PENDING status pending admin verification.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>Farm application submitted successfully! Status: PENDING Admin Approval. Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Owner / Manager Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Farmer Name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Contact Phone *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 block mb-1">Farm / Business Name *</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. Indus Valley Organic Agro"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 block mb-1">Official Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farm@kisanova.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 block mb-1">Farm & Warehousing Address *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot / Sector, Agricultural District"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 block mb-1">Crops Cultivated & Bio</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Organic grains, seasonal fruits, non-GMO farming..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 block mb-1">Portal Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-agro-600 hover:bg-agro-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-agro-600/30 transition-colors flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Submitting Application...' : 'Submit Farmer Application'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-2 space-y-2">
          <p>
            Already registered as a seller?{' '}
            <Link to="/seller/login" className="font-bold text-agro-400 hover:text-agro-300 underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerRegisterPage;
