import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Building,
  Sprout,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatPKR } from '../../utils/currency';

const CartPage = () => {
  const { groupedBySeller, grandTotal, totalItemsCount, updateQuantity, removeFromCart, clearCart } = useCart();
  const { isAuthenticated, isBuyer } = useAuth();
  const navigate = useNavigate();

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      // Remember where the buyer was going so they are returned here after login!
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    navigate('/checkout');
  };

  if (groupedBySeller.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-agro-50 text-agro-600 flex items-center justify-center mx-auto shadow-sm">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Your Agricultural Cart is Empty</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Explore our certified farms and add fresh crops, grains, and organic produce to your cart.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-agro-600 hover:bg-agro-700 text-white rounded-xl text-sm font-bold shadow-md shadow-agro-600/20 transition-all"
        >
          <Sprout className="w-4 h-4" />
          <span>Browse Marketplace</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Multi-Seller Cart</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Items from <strong className="text-slate-900">{groupedBySeller.length} independent farms</strong> combined into one seamless checkout.
          </p>
        </div>
        <button
          onClick={clearCart}
          className="self-start sm:self-auto text-xs font-semibold text-red-600 hover:text-red-700 underline flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All Items
        </button>
      </div>

      {/* Main Cart Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Grouped by Seller */}
        <div className="lg:col-span-2 space-y-6">
          {groupedBySeller.map((sellerGroup) => (
            <div
              key={sellerGroup.seller_id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Seller Farm Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-agro-600 text-white flex items-center justify-center font-bold text-xs">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      {sellerGroup.farm_name}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        Verified Farmer
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate max-w-sm">{sellerGroup.seller_address}</p>
                  </div>
                </div>

                <div className="text-right self-end sm:self-auto">
                  <span className="text-xs text-slate-500">Farm Subtotal: </span>
                  <strong className="text-sm font-black text-slate-900">
                    {formatPKR(sellerGroup.seller_subtotal)}
                  </strong>
                </div>
              </div>

              {/* Items Table for this Seller */}
              <div className="divide-y divide-slate-100 px-6">
                {sellerGroup.items.map((item) => (
                  <div key={item.item_id || item.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={item.image_url}
                        alt={item.product_title}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                      />
                      <div>
                        <Link
                          to={`/products/${item.product_id}`}
                          className="font-bold text-sm text-slate-900 hover:text-agro-600 transition-colors line-clamp-1"
                        >
                          {item.product_title}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatPKR(item.current_price || item.price)} / {item.product_unit}
                        </p>
                      </div>
                    </div>

                    {/* Quantity controls & subtotal */}
                    <div className="flex items-center justify-between w-full sm:w-auto gap-6 self-end sm:self-auto">
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          onClick={() => updateQuantity(item.item_id || item.id, parseFloat(item.quantity) - 1)}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-xs font-bold text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.item_id || item.id, parseFloat(item.quantity) + 1)}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="font-black text-sm text-slate-900">
                          {formatPKR(item.subtotal)}
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.item_id || item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Col: Order Summary & Checkout CTA */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm sticky top-28 space-y-6">
            <h3 className="font-black text-lg text-slate-900 pb-3 border-b border-slate-100">
              Order Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Items:</span>
                <strong className="text-slate-900">{totalItemsCount} units</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sellers Involved:</span>
                <strong className="text-slate-900">{groupedBySeller.length} Farms</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping / Logistics:</span>
                <span className="text-emerald-700 font-bold">Direct Freight (Included)</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-900">Grand Total:</span>
              <span className="text-2xl font-black text-slate-900">{formatPKR(grandTotal)}</span>
            </div>

            <button
              onClick={handleProceedToCheckout}
              className="w-full py-4 px-6 rounded-2xl bg-agro-600 hover:bg-agro-700 text-white font-bold text-sm shadow-lg shadow-agro-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!isAuthenticated && (
              <p className="text-[11px] text-center text-slate-500">
                You will be prompted to sign in or register before confirming delivery.
              </p>
            )}

            <div className="pt-2 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-agro-600" />
                <span>Escrow payment protection guaranteed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-agro-600" />
                <span>Each farm packs & ships their lots independently</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
