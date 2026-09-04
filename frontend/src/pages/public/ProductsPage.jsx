import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, ShoppingBag, ShieldCheck, ArrowUpDown, X, Sprout } from 'lucide-react';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const { addToCart } = useCart();

  // Search & Filter state initialized from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [addedNotification, setAddedNotification] = useState('');

  // Fetch categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/products/categories');
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCats();
  }, []);

  // Fetch products whenever filters or searchParams change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category && category !== 'All') params.set('category', category);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (sort) params.set('sort', sort);
        params.set('page', searchParams.get('page') || '1');

        const res = await api.get(`/products?${params.toString()}`);
        if (res.data.success) {
          setProducts(res.data.data.products);
          setPagination(res.data.data.pagination);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams]);

  const handleApplyFilter = (e) => {
    if (e) e.preventDefault();
    const newParams = new URLSearchParams();
    if (search.trim()) newParams.set('search', search.trim());
    if (category && category !== 'All') newParams.set('category', category);
    if (minPrice) newParams.set('minPrice', minPrice);
    if (maxPrice) newParams.set('maxPrice', maxPrice);
    if (sort) newParams.set('sort', sort);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleClearFilter = () => {
    setSearch('');
    setCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setSearchParams({});
  };

  const handleAddToCart = async (product) => {
    const res = await addToCart(product, 1);
    if (res.success) {
      setAddedNotification(`Added "${product.title}" to cart!`);
      setTimeout(() => setAddedNotification(''), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notification */}
      {addedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-agro-700 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <ShoppingBag className="w-4 h-4" />
          <span>{addedNotification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Agricultural Marketplace</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore audit-approved fresh produce, grains, and specialty crops straight from certified growers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Filter Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-agro-600" />
                Filter Crops
              </span>
              <button
                onClick={handleClearFilter}
                className="text-xs text-slate-400 hover:text-slate-700 underline"
              >
                Reset
              </button>
            </div>

            {/* Keyword Search */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Search Keywords</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Wheat, honey, cotton..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500"
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Crop Category</label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-agro-600">
                  <input
                    type="radio"
                    name="category"
                    checked={category === 'All'}
                    onChange={() => setCategory('All')}
                    className="text-agro-600 focus:ring-agro-500"
                  />
                  <span>All Categories</span>
                </label>
                {categories.map((c) => (
                  <label
                    key={c.category}
                    className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:text-agro-600"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        checked={category === c.category}
                        onChange={() => setCategory(c.category)}
                        className="text-agro-600 focus:ring-agro-500"
                      />
                      <span>{c.category}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">({c.product_count})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Price Range ($)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500"
                />
              </div>
            </div>

            <button
              onClick={handleApplyFilter}
              className="w-full py-2.5 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </aside>

        {/* Right Main Product Feed */}
        <div className="lg:col-span-3 space-y-6">
          {/* Controls Bar: Results count & Sort */}
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-900">{products.length}</strong> of{' '}
              <strong className="text-slate-900">{pagination.total}</strong> verified harvest lots
            </span>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('sort', e.target.value);
                  setSearchParams(newParams);
                }}
                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium text-slate-700"
              >
                <option value="newest">Newest Harvest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="title_asc">Title: A to Z</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 bg-slate-200 animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Sprout className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">No Matching Crops Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No verified agricultural products matched your current filters. Try changing or clearing your search criteria.
              </p>
              <button
                onClick={handleClearFilter}
                className="mt-2 px-4 py-2 bg-agro-50 text-agro-700 text-xs font-bold rounded-xl hover:bg-agro-100"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col group"
                >
                  {/* Image & Badges */}
                  <Link to={`/products/${product.id}`} className="relative h-48 overflow-hidden block bg-slate-100">
                    <img
                      src={product.primary_image}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-800 shadow-sm">
                      {product.category}
                    </div>
                    {product.crop_type && (
                      <div className="absolute bottom-3 left-3 bg-agro-900/80 backdrop-blur-sm text-agro-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {product.crop_type}
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Seller Information */}
                      <p className="text-[11px] font-semibold text-agro-700 uppercase tracking-wide flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-agro-600" />
                        {product.farm_name}
                      </p>

                      <Link to={`/products/${product.id}`} className="block mt-1">
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 hover:text-agro-600 transition-colors">
                          {product.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-black text-slate-900">${parseFloat(product.price).toFixed(2)}</span>
                        <span className="text-xs text-slate-500 ml-1">/ {product.unit}</span>
                        <p className="text-[10px] text-slate-400">Stock: {product.available_quantity} {product.unit}</p>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        className="p-2.5 rounded-xl bg-agro-50 text-agro-700 hover:bg-agro-600 hover:text-white transition-colors"
                        title="Add to Cart"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
