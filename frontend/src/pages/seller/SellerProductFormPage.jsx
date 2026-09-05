import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Save, Sprout, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const categories = [
  { value: 'Grains & Cereals', key: 'product.category_grains' },
  { value: 'Fruits & Vegetables', key: 'product.category_fruits_veg' },
  { value: 'Organic Produce', key: 'product.category_organic' },
  { value: 'Dairy & Farm', key: 'product.category_dairy' },
  { value: 'Cash Crops', key: 'product.category_cash_crops' },
  { value: 'Spices & Herbs', key: 'product.category_spices' },
  { value: 'Seeds & Plantlings', key: 'product.category_seeds' }
];

const units = [
  'kg',
  'bag (50kg)',
  'bag (25kg)',
  'crate (5kg)',
  'crate (10kg)',
  'crate (12kg)',
  'sack (20kg)',
  'sack (25kg)',
  'bale (170kg)',
  'jar (1kg)',
  'bottle (2L)',
  'ton',
  'bushel'
];

const SellerProductFormPage = () => {
  const { t, isRTL } = useLanguage();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Grains & Cereals');
  const [cropType, setCropType] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [availableQuantity, setAvailableQuantity] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [existingImages, setExistingImages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isEdit) {
      const fetchProduct = async () => {
        try {
          const res = await api.get(`/products/${id}`);
          if (res.data.success) {
            const p = res.data.data.product;
            setTitle(p.title);
            setCategory(p.category);
            setCropType(p.crop_type || '');
            setDescription(p.description);
            setPrice(p.price);
            setUnit(p.unit);
            setAvailableQuantity(p.available_quantity);
            setStatus(p.status || 'ACTIVE');
            setExistingImages(p.images || []);
          }
        } catch (err) {
          setErrorMessage('Failed to load product data.');
        } finally {
          setFetching(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('crop_type', cropType);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('unit', unit);
      formData.append('available_quantity', availableQuantity);
      if (isEdit) formData.append('status', status);

      // Append files
      for (let i = 0; i < imageFiles.length; i++) {
        formData.append('images', imageFiles[i]);
      }

      // Append direct image URL if user typed one
      if (imageUrlInput.trim()) {
        formData.append('image_urls', imageUrlInput.trim());
      }

      let res;
      if (isEdit) {
        res = await api.put(`/seller/products/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post('/seller/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (res.data.success) {
        setSuccessMessage(res.data.message || (isEdit ? 'Product updated successfully!' : 'Crop listed! Published immediately with ACTIVE status.'));
        setTimeout(() => {
          navigate('/seller/products');
        }, 1500);
      } else {
        setErrorMessage(res.data.message || 'Operation failed.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
      </div>
    );
  }

  return (
    <div className={`max-w-3xl mx-auto space-y-6 ${isRTL ? 'font-urdu' : ''}`}>
      {/* Header */}
      <div className="space-y-1">
        <Link
          to="/seller/products"
          className="text-xs font-bold text-slate-500 hover:text-agro-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('action.back', 'Back to Crop Inventory')}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          {isEdit ? `${t('product.edit', 'Edit Crop')}: ${title}` : t('product.add_new', 'Add New Agricultural Produce')}
        </h1>
        <p className="text-xs text-slate-500">
          {isEdit
            ? (isRTL ? 'فصل کی تفصیلات، تازہ نرخ یا موجود اسٹاک کو اپ ڈیٹ کریں۔' : 'Update crop specifications, current harvest price, or available inventory.')
            : (isRTL ? 'مارکیٹ میں خریداروں کے لیے نئی فصل یا پیداوار کی تفصیلات درج کریں۔' : 'List a new agricultural crop for immediate public sale to verified buyers.')}
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">{t('product.title', 'Crop / Product Title')} *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isRTL ? 'مثال: گندم امبر گریڈ اے، چاول باسمتی' : 'e.g. Golden Amber Durum Wheat (Grade A)'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('product.category', 'Agricultural Category')} *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium text-slate-700"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {t(c.key, c.value)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('product.crop_type', 'Crop Type / Botanical Strain')}</label>
              <input
                type="text"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                placeholder={isRTL ? 'مثال: درم گندم، الفانسو آم' : 'e.g. Durum Wheat, Alphonso Mango'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('product.price', 'Price (PKR)')} *</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 450"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('product.unit', 'Packaging / Pricing Unit')} *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium text-slate-700"
              >
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('product.stock', 'Available Quantity (Units)')} *</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value)}
                placeholder="100"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">{t('product.description', 'Harvest Description & Specifications')} *</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isRTL ? 'نمی کا تناسب، کوالٹی گریڈ، کٹائی کی تاریخ، اسٹوریج کی صورتحال وغیرہ بیان کریں...' : 'Describe moisture levels, purity percentage, harvest date, certifications, storage conditions...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium leading-relaxed"
            />
          </div>

          {/* Media Images */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="text-xs font-bold text-slate-700 block">{t('product.images', 'Product Images')}</label>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {existingImages.map((img) => (
                  <img
                    key={img.id}
                    src={img.image_url}
                    alt="product preview"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                  />
                ))}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-2">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-agro-700">{t('product.upload_photos', 'Click to upload harvest photos')}</span> (JPG, PNG, WEBP)
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImageFiles(Array.from(e.target.files))}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-agro-50 file:text-agro-700 hover:file:bg-agro-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                {t('product.or_image_url', 'Or provide an image web URL:')}
              </label>
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500"
              />
            </div>
          </div>

          {/* If edit, allow toggling INACTIVE */}
          {isEdit && (
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('status.active', 'Listing Availability Status')}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full sm:w-60 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium text-slate-700"
              >
                <option value="ACTIVE">{t('status.active', 'ACTIVE')} (Visible in Marketplace)</option>
                <option value="INACTIVE">{isRTL ? 'غیر فعال (پوشیدہ)' : 'INACTIVE (Hidden / Paused)'}</option>
              </select>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            to="/seller/products"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {t('action.cancel', 'Cancel')}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-md shadow-agro-600/20 transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? '...' : isEdit ? t('action.save', 'Update Crop') : t('product.add_new', 'Create Crop Listing')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SellerProductFormPage;
