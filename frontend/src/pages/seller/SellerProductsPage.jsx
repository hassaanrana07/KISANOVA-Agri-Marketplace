import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Package, CheckCircle, Clock, AlertCircle, EyeOff, Search } from 'lucide-react';
import api from '../../services/api';
import { formatPKR } from '../../utils/currency';
import { useLanguage } from '../../context/LanguageContext';

const SellerProductsPage = () => {
  const { t, isRTL } = useLanguage();
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = '/seller/products';
      if (statusFilter) url += `?status=${statusFilter}`;
      const res = await api.get(url);
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching seller products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const handleDeleteProduct = async (id, title) => {
    if (!window.confirm(`Are you sure you want to deactivate or remove "${title}"?`)) return;

    try {
      const res = await api.delete(`/seller/products/${id}`);
      if (res.data.success) {
        setActionNotice(res.data.message || 'Product removed.');
        setTimeout(() => setActionNotice(''), 3000);
        fetchProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete product.');
    }
  };

  const filtered = products.filter(p => 
    !searchFilter || 
    p.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
    p.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const getStatusBadge = (status) => {
    if (status === 'ACTIVE' || status === 'APPROVED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
          <CheckCircle className="w-3 h-3" />
          {t('status.active', 'ACTIVE')}
        </span>
      );
    }
    if (status === 'INACTIVE') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1 w-fit">
          <EyeOff className="w-3 h-3" />
          {t('status.cancelled', 'INACTIVE')}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 flex items-center gap-1 w-fit">
        {t(`status.${(status || '').toLowerCase()}`, status)}
      </span>
    );
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'font-urdu' : ''}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{t('nav.products', 'Crop Inventory')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isRTL ? 'اپنی فصلوں کی فہرست، نرخ، مقدار اور مارکیٹ کی ترتیبات کا انتظام کریں۔' : 'Manage your crop listings, live pricing, stock quantities, and marketplace visibility.'}
          </p>
        </div>

        <Link
          to="/seller/products/new"
          className="px-4 py-2.5 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold shadow-md shadow-agro-600/20 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('action.add_product', 'Add New Crop')}</span>
        </Link>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {actionNotice}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className={`w-4 h-4 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5`} />
          <input
            type="text"
            placeholder={t('chat.search', 'Search crop title...')}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500`}
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-500 font-medium">{t('product.category', 'Status')}:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-agro-500"
          >
            <option value="">{isRTL ? 'تمام صورتحال' : 'All Statuses'}</option>
            <option value="ACTIVE">{t('status.active', 'Active in Marketplace')}</option>
            <option value="INACTIVE">{isRTL ? 'غیر فعال' : 'Inactive / Paused'}</option>
          </select>
        </div>
      </div>

      {/* Table of Products */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-agro-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">{t('product.no_products', 'No products found matching the criteria.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} text-xs`}>
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">{t('product.title', 'Crop Item')}</th>
                  <th className="py-3.5 px-6">{t('product.category', 'Category')}</th>
                  <th className="py-3.5 px-6">{t('product.price', 'Price')}</th>
                  <th className="py-3.5 px-6">{t('product.stock', 'Available Stock')}</th>
                  <th className="py-3.5 px-6">{t('status.active', 'Moderation Status')}</th>
                  <th className="py-3.5 px-6">{t('product.harvest_date', 'Created')}</th>
                  <th className={`py-3.5 px-6 ${isRTL ? 'text-left' : 'text-right'}`}>{t('action.manage', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.primary_image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=100&q=80'}
                          alt={prod.title}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-xs line-clamp-1">{prod.title}</p>
                          {prod.crop_type && <span className="text-[10px] text-slate-400">{prod.crop_type}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">{prod.category}</td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {formatPKR(prod.price)} <span className="text-[10px] text-slate-400 font-normal">/ {prod.unit}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`font-semibold ${parseFloat(prod.available_quantity) > 0 ? 'text-slate-800' : 'text-red-500'}`}>
                        {prod.available_quantity} {prod.unit}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(prod.status)}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(prod.created_at).toLocaleDateString()}
                    </td>
                    <td className={`py-4 px-6 ${isRTL ? 'text-left' : 'text-right'}`}>
                      <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'} gap-2`}>
                        <Link
                          to={`/seller/products/${prod.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-agro-700 hover:bg-agro-50 transition-colors"
                          title="Edit Crop"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Deactivate or Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerProductsPage;
