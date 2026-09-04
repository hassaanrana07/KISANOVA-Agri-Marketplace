import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  ShoppingBag,
  MessageSquare,
  Truck,
  CheckCircle,
  MapPin,
  Phone,
  ArrowLeft,
  Share2,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isBuyer } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [initiatingChat, setInitiatingChat] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/products/${id}`);
        if (res.data.success) {
          const prod = res.data.data.product;
          setProduct(prod);
          setRelated(res.data.data.related || []);
          if (prod.images && prod.images.length > 0) {
            setSelectedImage(prod.images[0].image_url);
          }
        } else {
          setError('Product not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load product details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    const res = await addToCart(product, quantity);
    if (res.success) {
      setToastMessage(`Added ${quantity} ${product.unit} to cart!`);
      setTimeout(() => setToastMessage(''), 3000);
    } else {
      setToastMessage(res.message || 'Could not add to cart.');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleChatWithSeller = async () => {
    if (!isAuthenticated) {
      // Remember where the buyer was so they return here after login!
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (!isBuyer) {
      alert('Only registered buyers can initiate chat inquiries with sellers.');
      return;
    }

    setInitiatingChat(true);
    try {
      const res = await api.post('/chat/conversations', {
        seller_id: product.seller_id,
        product_id: product.id
      });

      if (res.data.success) {
        navigate(`/chat?conversationId=${res.data.data.conversation_id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start chat with farmer.');
    } finally {
      setInitiatingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-agro-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">{error || 'Product Unavailable'}</h2>
        <p className="text-xs text-slate-500">This harvest batch might have sold out or been removed.</p>
        <Link to="/products" className="inline-block px-4 py-2 bg-agro-600 text-white rounded-xl text-xs font-bold">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-agro-800 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-agro-600">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-agro-600">Products</Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate">{product.title}</span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
        {/* Left: Image Gallery */}
        <div className="space-y-4">
          <div className="h-96 sm:h-[420px] rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
            <img
              src={selectedImage || product.primary_image}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImage === img.image_url ? 'border-agro-600 scale-95 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.image_url} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details & Purchase Actions */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-agro-50 text-agro-700 text-xs font-bold rounded-full border border-agro-200">
                {product.category}
              </span>
              {product.crop_type && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                  {product.crop_type}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {product.title}
            </h1>

            {/* Price Display */}
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-3xl font-black text-slate-900">${parseFloat(product.price).toFixed(2)}</span>
              <span className="text-slate-500 text-sm font-medium">per {product.unit}</span>
            </div>

            {/* Stock Availability */}
            <div className="text-xs">
              {parseFloat(product.available_quantity) > 0 ? (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  In Stock: {product.available_quantity} {product.unit} available
                </span>
              ) : (
                <span className="text-red-700 font-bold bg-red-50 px-2.5 py-1 rounded-md">
                  Currently Out of Stock
                </span>
              )}
            </div>

            {/* Description */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Crop Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Quantity Selector & Add to Cart */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-700">Quantity ({product.unit}):</span>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 font-bold"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-xs font-bold text-slate-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(parseFloat(product.available_quantity), quantity + 1))}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  disabled={parseFloat(product.available_quantity) <= 0}
                  className="py-3.5 px-6 rounded-xl bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md shadow-agro-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>

                {/* Direct Chat with Seller CTA */}
                <button
                  onClick={handleChatWithSeller}
                  disabled={initiatingChat}
                  className="py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-agro-400" />
                  <span>{initiatingChat ? 'Opening Chat...' : 'Chat with Seller'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Seller / Farm Card */}
          <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Produced By</span>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-agro-600" />
                  {product.farm_name}
                </h4>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                <CheckCircle className="w-3 h-3" />
                Verified Farmer
              </span>
            </div>

            {product.seller_bio && (
              <p className="text-xs text-slate-600 italic">"{product.seller_bio}"</p>
            )}

            <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{product.seller_address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{product.seller_phone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products from Same Category */}
      {related.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Similar Crops in {product.category}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((rel) => (
              <Link
                key={rel.id}
                to={`/products/${rel.id}`}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all p-4 group"
              >
                <div className="h-40 rounded-xl overflow-hidden bg-slate-100 mb-3">
                  <img
                    src={rel.primary_image || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=80'}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-[11px] font-semibold text-agro-700">{rel.farm_name}</p>
                <h4 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-agro-600">
                  {rel.title}
                </h4>
                <p className="text-sm font-black text-slate-900 mt-2">
                  ${parseFloat(rel.price).toFixed(2)} <span className="text-xs text-slate-500 font-normal">/ {rel.unit}</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
