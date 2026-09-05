import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Sprout,
  ShieldCheck,
  Truck,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { formatPKR } from '../../utils/currency';

const categoryList = [
  { name: 'Grains & Cereals', desc: 'Wheat, basmati rice, corn & barley', img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80' },
  { name: 'Fruits & Vegetables', desc: 'Alphonso mangoes, onions & tomatoes', img: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=400&q=80' },
  { name: 'Organic Produce', desc: 'Raw wildflower honey & herbs', img: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80' },
  { name: 'Dairy & Farm', desc: 'A2 fresh milk & artisan ghee', img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80' },
  { name: 'Cash Crops', desc: 'Long-staple raw ginned cotton & oilseeds', img: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=400&q=80' }
];

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/products?limit=8&sort=newest');
        if (res.data.success) {
          setFeaturedProducts(res.data.data.products);
        }
      } catch (err) {
        console.error('Error loading featured crops:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-16 pb-16 max-w-full overflow-x-hidden">
      {/* 1. Hero Section with Agricultural Landscape Imagery */}
      <section className="relative bg-slate-950 text-white overflow-hidden py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        {/* Background Image with Dark Vignette Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=2000&q=80"
            alt="Lush green agricultural fields in Pakistan"
            className="w-full h-full object-cover object-center opacity-25 scale-105 transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-agro-950/75"></div>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-agro-500/20 border border-agro-400/40 text-agro-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-agro-400" />
            Pakistan's Direct Farm-to-Buyer Marketplace
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
            Fresh Harvests Direct From <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-agro-300 via-agro-400 to-emerald-300 underline decoration-agro-500/40">
              Verified Farmers
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-200 max-w-3xl mx-auto font-normal leading-relaxed drop-shadow-sm">
            Bypass commission agents and middlemen. Procure certified wheat, basmati rice, seasonal fruits, organic produce, and cash crops directly from audited farm fields with GPS boundary mapping, 100% Cash on Delivery, and direct dispatch.
          </p>

          {/* Hero Search Bar */}
          <form onSubmit={handleHeroSearch} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-2 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl">
            <div className="flex-1 flex items-center bg-white rounded-xl px-4 py-3 text-slate-800">
              <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search crops: Wheat, Super Basmati Rice, Mangoes, Cotton..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm font-medium focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-agro-600 hover:bg-agro-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-agro-600/30"
            >
              <span>Search Harvests</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Hero Dual CTA Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/products"
              className="px-6 py-3 rounded-xl bg-agro-600 hover:bg-agro-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-agro-600/25 flex items-center gap-2"
            >
              <span>Explore Fresh Produce</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/seller/register"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all backdrop-blur-sm flex items-center gap-2"
            >
              <Sprout className="w-4 h-4 text-agro-400" />
              <span>Register Your Farm</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-xl sm:text-2xl font-black text-agro-400">100% COD</p>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium">Cash on Delivery Only</p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-xl sm:text-2xl font-black text-agro-400">GIS Verified</p>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium">Audited Farm Boundaries</p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-xl sm:text-2xl font-black text-agro-400">Direct Pricing</p>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium">Zero Commission Agents</p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-xl sm:text-2xl font-black text-agro-400">Direct Chat</p>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium">Real-Time Messaging</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Product Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-agro-600">Agricultural Sectors</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Browse by Crop Category</h2>
          </div>
          <Link to="/products" className="text-xs sm:text-sm font-bold text-agro-600 hover:text-agro-700 flex items-center gap-1">
            <span>View All Categories</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {categoryList.map((cat) => (
            <Link
              key={cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-200 bg-white flex flex-col"
            >
              <div className="h-36 overflow-hidden relative">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-agro-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{cat.desc}</p>
                </div>
                <span className="text-xs font-semibold text-agro-600 mt-3 inline-flex items-center gap-1 group-hover:underline">
                  Browse category <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-agro-600">Verified Harvests</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Featured Farm Products</h2>
          </div>
          <Link to="/products" className="text-xs sm:text-sm font-bold text-agro-600 hover:text-agro-700 flex items-center gap-1">
            <span>Explore All Harvests</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-slate-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-sm">No featured products currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
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
                    {/* Seller Name */}
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
                      <span className="text-lg font-black text-slate-900">{formatPKR(product.price)}</span>
                      <span className="text-xs text-slate-500 ml-1">/ {product.unit}</span>
                    </div>

                    <button
                      onClick={() => addToCart(product, 1)}
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
      </section>

      {/* 4. How Kisanova Works */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-agro-400">Seamless Agricultural Trading</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">How Kisanova Works</h2>
            <p className="text-sm text-slate-400 mt-2">A transparent marketplace connecting certified cultivators directly with commercial and domestic buyers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 relative">
              <div className="w-12 h-12 rounded-xl bg-agro-600 text-white flex items-center justify-center font-black text-lg mb-4 shadow-lg shadow-agro-600/30">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Discover Verified Crops</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browse audit-approved farms. Inspect crop specifications, available quantities, live pricing per bag or ton, and direct certificates.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 relative">
              <div className="w-12 h-12 rounded-xl bg-agro-600 text-white flex items-center justify-center font-black text-lg mb-4 shadow-lg shadow-agro-600/30">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Seller Unified Cart</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add durum wheat from Punjab and Alphonso mangoes from Maharashtra in the same shopping cart. Our system automatically routes individual orders to each farmer.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 relative">
              <div className="w-12 h-12 rounded-xl bg-agro-600 text-white flex items-center justify-center font-black text-lg mb-4 shadow-lg shadow-agro-600/30">
                3
              </div>
              <h3 className="text-lg font-bold text-white mb-2">COD & Farm Gate Pickup</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pay with Cash on Delivery (COD) upon physical shipment inspection, or collect directly from the farm fields with Farm Gate Self-Pickup. Chat with each farmer in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Marketplace Value Proposition Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-agro-800 to-agro-900 text-white p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-agro-300">Are You A Farmer Or Cooperative?</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Sell Your Yields Directly to National & Global Buyers</h2>
            <p className="text-xs sm:text-sm text-agro-100 leading-relaxed">
              Join Kisanova as a verified seller. Manage crop inventories, set your own prices, track purchase orders, and receive secure payments with zero commission gouging.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link
              to="/seller/register"
              className="px-6 py-3.5 rounded-xl bg-white text-agro-900 font-bold text-sm hover:bg-agro-50 shadow-lg transition-colors text-center"
            >
              Apply As Verified Farmer
            </Link>
            <Link
              to="/seller/login"
              className="px-6 py-3.5 rounded-xl bg-agro-700/80 hover:bg-agro-700 border border-agro-500/30 text-white font-bold text-sm transition-colors text-center"
            >
              Farmer Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
