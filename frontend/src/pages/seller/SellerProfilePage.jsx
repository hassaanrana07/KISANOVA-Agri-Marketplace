import React, { useState, useEffect } from 'react';
import {
  Building,
  Phone,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Save,
  Compass,
  Layers,
  Truck,
  User,
  Clock,
  Info
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import FarmLocationPicker from '../../components/common/FarmLocationPicker';
import MediaUploadField from '../../components/common/MediaUploadField';
import { formatPKR } from '../../utils/currency';

const SellerProfilePage = () => {
  const { seller, updateSeller } = useAuth();
  const { t, isRTL } = useLanguage();

  // Active Profile Section Tab
  const [activeTab, setActiveTab] = useState('identity'); // 'identity', 'location', 'fulfillment'

  // Section 1: Farm Identity & Contact
  const [farmName, setFarmName] = useState(seller?.farm_name || '');
  const [phone, setPhone] = useState(seller?.phone || '');
  const [address, setAddress] = useState(seller?.address || '');
  const [bio, setBio] = useState(seller?.bio || '');
  const [businessInfo, setBusinessInfo] = useState(seller?.business_info || '');
  const [logoUrl, setLogoUrl] = useState(seller?.logo_url || seller?.profile_image || '');

  // Section 2: Administrative Location & Boundary State
  const [locationState, setLocationState] = useState({
    province: seller?.province || 'Punjab',
    district: seller?.district || 'Sahiwal',
    tehsil: seller?.tehsil || 'Sahiwal',
    village: seller?.village || 'Chak 88/9-L',
    latitude: seller?.latitude ? parseFloat(seller.latitude) : 30.6682,
    longitude: seller?.longitude ? parseFloat(seller.longitude) : 73.1114,
    farm_polygon: seller?.farm_polygon || [],
    seller_declared_area_acres: seller?.seller_declared_area_acres || 25.0,
    calculated_polygon_area_acres: seller?.calculated_polygon_area_acres || 0
  });

  // Section 3: Fulfillment Settings
  const [deliveryAvailable, setDeliveryAvailable] = useState(
    seller?.delivery_available !== undefined ? Boolean(seller.delivery_available) : true
  );
  const [pickupAvailable, setPickupAvailable] = useState(
    seller?.pickup_available !== undefined ? Boolean(seller.pickup_available) : true
  );
  const [deliveryMinDays, setDeliveryMinDays] = useState(seller?.estimated_delivery_min_days || 2);
  const [deliveryMaxDays, setDeliveryMaxDays] = useState(seller?.estimated_delivery_max_days || 4);
  const [deliveryFee, setDeliveryFee] = useState(seller?.delivery_fee !== null && seller?.delivery_fee !== undefined ? seller.delivery_fee : 300);
  const [pickupInstructions, setPickupInstructions] = useState(
    seller?.pickup_instructions || 'Main Farm Gate 2, Sahiwal-Faisalabad Road. Loading available 08:00 to 18:00.'
  );

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  useEffect(() => {
    if (seller) {
      setFarmName(seller.farm_name || '');
      setPhone(seller.phone || '');
      setAddress(seller.address || '');
      setBio(seller.bio || '');
      setBusinessInfo(seller.business_info || '');
      setLogoUrl(seller.logo_url || seller.profile_image || '');

      setLocationState({
        province: seller.province || 'Punjab',
        district: seller.district || 'Sahiwal',
        tehsil: seller.tehsil || 'Sahiwal',
        village: seller.village || 'Chak 88/9-L',
        latitude: seller.latitude ? parseFloat(seller.latitude) : 30.6682,
        longitude: seller.longitude ? parseFloat(seller.longitude) : 73.1114,
        farm_polygon: seller.farm_polygon || [],
        seller_declared_area_acres: seller.seller_declared_area_acres || 25.0,
        calculated_polygon_area_acres: seller.calculated_polygon_area_acres || 0
      });

      if (seller.delivery_available !== undefined) setDeliveryAvailable(Boolean(seller.delivery_available));
      if (seller.pickup_available !== undefined) setPickupAvailable(Boolean(seller.pickup_available));
      if (seller.estimated_delivery_min_days) setDeliveryMinDays(seller.estimated_delivery_min_days);
      if (seller.estimated_delivery_max_days) setDeliveryMaxDays(seller.estimated_delivery_max_days);
      if (seller.delivery_fee !== null && seller.delivery_fee !== undefined) setDeliveryFee(seller.delivery_fee);
      if (seller.pickup_instructions) setPickupInstructions(seller.pickup_instructions);
    }
  }, [seller]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice('');
    setErrorNotice('');

    try {
      const res = await api.put('/seller/profile', {
        farm_name: farmName,
        phone,
        address,
        province: locationState.province,
        district: locationState.district,
        tehsil: locationState.tehsil,
        village: locationState.village,
        city: locationState.tehsil || locationState.district,
        region: locationState.province,
        latitude: locationState.latitude,
        longitude: locationState.longitude,
        farm_polygon: locationState.farm_polygon,
        seller_declared_area_acres: locationState.seller_declared_area_acres,
        calculated_polygon_area_acres: locationState.calculated_polygon_area_acres,
        logo_url: logoUrl,
        profile_image: logoUrl,
        bio,
        business_info: businessInfo,
        delivery_available: deliveryAvailable,
        pickup_available: pickupAvailable,
        estimated_delivery_min_days: deliveryMinDays,
        estimated_delivery_max_days: deliveryMaxDays,
        delivery_fee: deliveryFee,
        pickup_instructions: pickupInstructions
      });

      if (res.data.success) {
        updateSeller(res.data.data);
        setNotice(res.data.message || 'Farm profile updated successfully.');
        setTimeout(() => setNotice(''), 4500);
      }
    } catch (err) {
      setErrorNotice(err.response?.data?.message || 'Failed to update farm profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${isRTL ? 'font-urdu' : ''}`}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{t('profile.title', 'Farm Profile & Settings')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isRTL ? 'اپنے فارم کا برانڈ نام، پٹوار رقبہ، باؤنڈری نقشہ، ترسیلی شرائط اور اکاؤنٹ کی ترتیبات منظم کریں۔' : 'Manage your agricultural brand identity, administrative location hierarchy, farm polygon boundaries, fulfillment terms, and payout routing.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleUpdate}
          disabled={loading}
          className="px-5 py-2.5 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-agro-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{t('profile.save_profile', 'Save Changes')}</span>
        </button>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Verification Status Alert Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {isRTL ? 'فارم کی تصدیقی حیثیت' : 'Account Verification Status'}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
              seller?.approval_status === 'APPROVED'
                ? 'bg-emerald-100 text-emerald-800'
                : seller?.approval_status === 'REVIEW_REQUIRED'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-800'
            }`}>
              <CheckCircle className="w-3.5 h-3.5" />
              {seller?.approval_status === 'APPROVED'
                ? (isRTL ? 'تصدیق شدہ اور منظور شدہ کسان' : 'Approved & Certified Cultivator')
                : seller?.approval_status === 'REVIEW_REQUIRED'
                ? (isRTL ? 'زیرِ جائزہ (انتظامی جانچ جاری ہے)' : 'Review Required (Modifications Under Audit)')
                : (isRTL ? 'زیرِ تصدیق' : 'Pending Verification')}
            </span>
          </div>
          {seller?.approval_status === 'REVIEW_REQUIRED' && (
            <p className="text-xs text-amber-700 mt-1">
              {isRTL
                ? 'فارم کا نام تبدیل کرنے پر ایڈمن کی تصدیق درکار ہوتی ہے۔ آپ کی موجودہ لسٹنگز بدستور فعال رہیں گی۔'
                : 'Modifying sensitive verification information (Farm Name) is currently being audited by Kisanova administrators. Your existing listings remain accessible.'}
            </p>
          )}
        </div>

        <div className={`${isRTL ? 'text-left' : 'text-right'} text-xs text-slate-500 hidden sm:block`}>
          <span>{isRTL ? 'ممبر شناخت' : 'Member ID'}: <strong className="font-mono text-slate-800">#{seller?.id}</strong></span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'identity', label: isRTL ? '1. فارم شناخت اور رابطہ' : '1. Farm Identity', icon: Building },
          { id: 'location', label: isRTL ? '2. مقام اور باؤنڈری نقشہ' : '2. Location & Boundary GIS', icon: Compass },
          { id: 'fulfillment', label: isRTL ? '3. ترسیلی طریقہ کار' : '3. Fulfillment Settings', icon: Truck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-agro-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Farm Identity & Contact */}
      {activeTab === 'identity' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-fadeIn">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-sm text-slate-900">Brand Identity & Public Contact</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Buyers view this information on your crop listings and official invoices.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Farm / Enterprise Name *
              </label>
              <input
                type="text"
                required
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-agro-500 font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Sensitive Field: Altering your verified farm title triggers administrative audit review.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Direct Contact Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-agro-500 font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Commercial / Tax Reg Number</label>
              <input
                type="text"
                value={businessInfo}
                onChange={(e) => setBusinessInfo(e.target.value)}
                placeholder="e.g. NTN / Agri Registry Number"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-agro-500 font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Harvest Loading Address *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-agro-500 font-semibold"
              />
            </div>

            {/* Farm Logo / Photo Upload */}
            <div className="sm:col-span-2 pt-2">
              <MediaUploadField
                label="Farm Logo or Verified Certificate"
                value={logoUrl}
                onChange={setLogoUrl}
                helpText="Upload farm banner or capture certification papers via mobile camera (JPG/PNG)"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Crops Cultivated & Bio</label>
              <textarea
                rows="3"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Administrative Location & Boundary GIS */}
      {activeTab === 'location' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-fadeIn">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-sm text-slate-900">Administrative Location & Farm Boundary</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your administrative hierarchy. Draw your farm's authoritative polygon ($A \to B \to C \to D$) to calculate and verify exact harvest acreage.
            </p>
          </div>

          <FarmLocationPicker
            province={locationState.province}
            district={locationState.district}
            tehsil={locationState.tehsil}
            village={locationState.village}
            latitude={locationState.latitude}
            longitude={locationState.longitude}
            farmPolygon={locationState.farm_polygon}
            declaredAcreage={locationState.seller_declared_area_acres}
            calculatedAcreage={locationState.calculated_polygon_area_acres}
            onChangeLocation={(updated) => {
              setLocationState((prev) => ({
                ...prev,
                ...updated
              }));
            }}
          />
        </div>
      )}

      {/* Tab 3: Fulfillment Settings */}
      {activeTab === 'fulfillment' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-fadeIn">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-sm text-slate-900">Harvest Fulfillment & Logistics Terms</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure available delivery and farm gate pickup options. Buyers select from these choices at checkout.
            </p>
          </div>

          <div className="space-y-6">
            {/* Delivery Option Toggle */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-agro-600" />
                    <span>Courier / Truck Dispatch Delivery Available</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Offer direct transport dispatch from your farm to buyer's destination address.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={deliveryAvailable}
                  onChange={(e) => setDeliveryAvailable(e.target.checked)}
                  className="w-5 h-5 text-agro-600 rounded border-slate-300 focus:ring-agro-500 cursor-pointer"
                />
              </div>

              {deliveryAvailable && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Min Estimated Days *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={deliveryMinDays}
                      onChange={(e) => setDeliveryMinDays(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-agro-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Max Estimated Days *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={deliveryMaxDays}
                      onChange={(e) => setDeliveryMaxDays(parseInt(e.target.value) || 2)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-agro-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Flat Delivery Fee (PKR) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-agro-500"
                      />
                      <span className="absolute left-3 top-2 font-bold text-slate-400 text-xs pointer-events-none">
                        PKR
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Farm Pickup Option Toggle */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-agro-600" />
                    <span>Farm Gate Pickup Available</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Allow buyers or their freight haulers to collect harvest lots directly at your farm gate (Zero delivery charge).
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={pickupAvailable}
                  onChange={(e) => setPickupAvailable(e.target.checked)}
                  className="w-5 h-5 text-agro-600 rounded border-slate-300 focus:ring-agro-500 cursor-pointer"
                />
              </div>

              {pickupAvailable && (
                <div className="pt-3 border-t border-slate-200 text-xs">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Pickup Instructions & Gate Details *
                  </label>
                  <textarea
                    rows="2"
                    value={pickupInstructions}
                    onChange={(e) => setPickupInstructions(e.target.value)}
                    placeholder="e.g. Main Farm Gate 2, Sahiwal-Faisalabad Road. Loading staff available 08:00 to 18:00."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agro-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Save Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleUpdate}
          disabled={loading}
          className="px-6 py-3 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-agro-600/20 transition-all flex items-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{t('profile.save_profile', 'Save Farm Profile & Terms')}</span>
        </button>
      </div>
    </div>
  );
};

export default SellerProfilePage;
