import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sprout,
  Lock,
  Mail,
  User,
  Phone,
  Building,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Home,
  Compass,
  Clock,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import FarmLocationPicker from '../../components/common/FarmLocationPicker';
import MediaUploadField from '../../components/common/MediaUploadField';

const SellerRegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [farmName, setFarmName] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Location Hierarchy & GIS State
  const [locationData, setLocationData] = useState({
    province: 'Punjab',
    district: 'Sahiwal',
    tehsil: 'Sahiwal',
    village: 'Chak 88/9-L',
    latitude: 30.6682,
    longitude: 73.1114,
    farm_polygon: [],
    calculated_polygon_area_acres: 0,
    seller_declared_area_acres: 25.0
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

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
        province: locationData.province,
        district: locationData.district,
        tehsil: locationData.tehsil,
        village: locationData.village,
        city: locationData.tehsil || locationData.district,
        region: locationData.province,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        farm_polygon: locationData.farm_polygon,
        seller_declared_area_acres: locationData.seller_declared_area_acres,
        calculated_polygon_area_acres: locationData.calculated_polygon_area_acres,
        logo_url: logoUrl,
        bio
      });

      if (res.success) {
        setShowReviewModal(true);
      } else {
        setErrorMessage(res.message || 'Registration failed.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Farmer registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-white relative">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-agro-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-agro-600/30">
            <Sprout className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Farmer / Cultivator Registration
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Directly market your agricultural yields. All prospective seller accounts undergo audit and verification before publishing active listings.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Section 1: Farmer & Farm Core Identity */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-agro-400 border-b border-slate-800 pb-2">
              1. Farmer & Farm Enterprise Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Cultivator / Owner Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Contact Phone Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1">Farm / Enterprise Name *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="e.g. Chenab Agro Orchards & Grains"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Official Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="farmer@kisanova.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1">Farm Dispatch Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Chak 88/9-L, Main Harappa Link Road, Sahiwal"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>

              {/* Farm Logo / Photo Upload */}
              <div className="sm:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <MediaUploadField
                  label="Farm Logo or Agricultural Certificate"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  helpText="Take photo via mobile camera or upload farm banner/logo (JPG/PNG)"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Administrative Location Hierarchy & Farm Boundary Map */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-agro-400">
                2. Administrative Location & GIS Farm Boundary
              </h3>
              <span className="text-[11px] text-slate-400">
                Draw polygon A→B→C→D to calculate exact acreage
              </span>
            </div>

            {/* Farm Location Picker with Hierarchical Cascade + Polygon Drawing */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <FarmLocationPicker
                province={locationData.province}
                district={locationData.district}
                tehsil={locationData.tehsil}
                village={locationData.village}
                latitude={locationData.latitude}
                longitude={locationData.longitude}
                farmPolygon={locationData.farm_polygon}
                declaredAcreage={locationData.seller_declared_area_acres}
                onChangeLocation={(updated) => {
                  setLocationData((prev) => ({
                    ...prev,
                    ...updated
                  }));
                }}
              />
            </div>
          </div>

          {/* Section 3: Farm Bio & Crops */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-agro-400 border-b border-slate-800 pb-2">
              3. Farm Description
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Crops Cultivated & Farm Bio</label>
              <textarea
                rows="3"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Cultivating Basmati Rice, Kinnow Citrus, Cotton, and Wheat across certified organic acreage..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-agro-600 hover:bg-agro-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-agro-600/30 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Submit Farm Application for Verification</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/seller/login" className="text-agro-400 font-bold hover:underline">
            Log in to Farmer Portal
          </Link>
        </p>
      </div>

      {/* Under-Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 text-white relative">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Your Seller Account is Under Review</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Thank you for registering your farm on <strong>Kisanova</strong>! To protect harvest quality and ensure verified agricultural trade, our administrators review all new cultivator applications before opening dashboard access.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Farm GPS coordinates and boundary logged</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Location: {locationData.tehsil}, {locationData.district}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Verification ETA: 12–24 business hours</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => navigate('/')}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Home</span>
              </button>

              <button
                onClick={() => navigate('/seller/login')}
                className="py-2.5 px-4 bg-agro-600 hover:bg-agro-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Go to Login</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerRegisterPage;
