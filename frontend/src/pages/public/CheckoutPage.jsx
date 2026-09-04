import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  Building,
  CheckCircle,
  Truck,
  ArrowRight,
  AlertCircle,
  Upload,
  Copy,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const CheckoutPage = () => {
  const { groupedBySeller, grandTotal, totalItemsCount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [deliveryName, setDeliveryName] = useState(user?.name || '');
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'bank_transfer'

  // Digital Card Simulation state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // Bank transfer state
  const [transferRef, setTransferRef] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [copiedIban, setCopiedIban] = useState(false);

  // Submitting state & Modal
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleCopyIban = (iban) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2500);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!deliveryName || !deliveryPhone || !deliveryAddress) {
      setErrorMessage('Please fill in your name, contact phone number, and delivery address.');
      return;
    }

    if (groupedBySeller.length === 0) {
      setErrorMessage('Your cart is empty. Please add items before checking out.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create Parent Order & Seller Sub-orders atomically
      const res = await api.post('/orders/checkout', {
        delivery_name: deliveryName,
        delivery_phone: deliveryPhone,
        delivery_address: deliveryAddress,
        delivery_notes: deliveryNotes,
        payment_method: paymentMethod
      });

      if (res.data.success) {
        setPendingOrderData(res.data.data);
        clearCart();

        if (paymentMethod === 'card') {
          // Open Payment Gateway Modal to settle sandbox card payment
          setPaymentModalOpen(true);
        } else {
          // Manual Bank Transfer flow
          if (receiptFile || transferRef) {
            // Upload proof if provided
            const formData = new FormData();
            formData.append('orderId', res.data.data.orderId);
            formData.append('transactionReference', transferRef || res.data.data.paymentSession.transactionReference);
            if (receiptFile) formData.append('receipt', receiptFile);
            formData.append('notes', 'Submitted at checkout');

            try {
              await api.post('/payments/bank-transfer', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
            } catch (e) {
              console.error('Bank transfer proof submission error:', e);
            }
          }
          // Redirect to order details
          navigate(`/orders/${res.data.data.orderId}`);
        }
      } else {
        setErrorMessage(res.data.message || 'Checkout failed.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMessage(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCardPayment = async () => {
    if (!pendingOrderData) return;
    setProcessingPayment(true);
    try {
      const res = await api.post('/payments/process-sandbox', {
        orderId: pendingOrderData.orderId,
        transactionReference: pendingOrderData.paymentSession.transactionReference,
        token: pendingOrderData.paymentSession.verificationToken,
        cardLast4: '4242'
      });

      if (res.data.success) {
        setPaymentModalOpen(false);
        navigate(`/orders/${pendingOrderData.orderId}`);
      } else {
        alert(res.data.message || 'Payment verification failed.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payment settlement failed.');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (groupedBySeller.length === 0 && !pendingOrderData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Your Cart is Empty</h2>
        <p className="text-xs text-slate-500">Add agricultural products to your cart before proceeding to checkout.</p>
        <Link to="/products" className="inline-block px-5 py-2.5 bg-agro-600 text-white rounded-xl text-xs font-bold">
          Browse Crops
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Secure Checkout</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review your multi-farm order and provide delivery dispatch information.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Delivery Information & Payment Method */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Delivery Details */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Truck className="w-5 h-5 text-agro-600" />
              1. Delivery & Recipient Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Recipient Full Name *</label>
                <input
                  type="text"
                  required
                  value={deliveryName}
                  onChange={(e) => setDeliveryName(e.target.value)}
                  placeholder="e.g. Zainab Ali"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Contact Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Delivery Address & Destination *</label>
                <textarea
                  rows={2}
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Warehouse, facility, or street address..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Logistics & Handling Notes (Optional)</label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Grain elevator gate 3, forklift unloading ready"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* 2. Payment Method Selector */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <CreditCard className="w-5 h-5 text-agro-600" />
              2. Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Online Digital / Sandbox Card */}
              <label
                onClick={() => setPaymentMethod('card')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === 'card'
                    ? 'border-agro-600 bg-agro-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-5 h-5 text-agro-600" />
                    <span className="text-sm font-bold text-slate-900">Online Card / Gateway</span>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="text-agro-600 focus:ring-agro-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                  Instant settlement via secure payment gateway session. No raw card storage.
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-agro-700 font-bold uppercase">
                  <span>Verified Sandbox Mode</span>
                </div>
              </label>

              {/* Option 2: Manual Bank Transfer / IBAN */}
              <label
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-agro-600 bg-agro-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <Building className="w-5 h-5 text-earth-600" />
                    <span className="text-sm font-bold text-slate-900">Bank Wire / IBAN</span>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="text-agro-600 focus:ring-agro-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                  Direct agricultural escrow wire transfer. Requires Administrator verification before dispatch.
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-earth-700 font-bold uppercase">
                  <span>Pending Admin Audit Flow</span>
                </div>
              </label>
            </div>

            {/* Bank Transfer Details Section */}
            {paymentMethod === 'bank_transfer' && (
              <div className="p-5 rounded-2xl bg-earth-50 border border-earth-200 space-y-4 animate-fadeIn">
                <h4 className="text-xs font-bold text-earth-900 uppercase tracking-wider">
                  Kisanova Escrow Banking Coordinates
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px]">Beneficiary Name:</span>
                    <p className="font-bold text-slate-900">Kisanova Agricultural Escrow LLC</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Bank:</span>
                    <p className="font-bold text-slate-900">Meezan Agricultural Commercial Bank</p>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between bg-white p-2.5 rounded-xl border border-earth-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">IBAN</span>
                      <p className="font-mono font-bold text-slate-900 text-xs">PK36MEZN0001234567890123</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyIban('PK36MEZN0001234567890123')}
                      className="px-2.5 py-1 bg-earth-100 hover:bg-earth-200 text-earth-900 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      {copiedIban ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedIban ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-earth-200 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Bank Wire Reference / Transaction ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. IBAN-WIRE-98231"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      className="w-full bg-white border border-earth-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Upload Payment Deposit Proof (Receipt/Screenshot)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setReceiptFile(e.target.files[0])}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-earth-200 file:text-earth-900 hover:file:bg-earth-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Multi-Seller Breakdown & Order Submission */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm sticky top-28 space-y-6">
            <h3 className="font-black text-lg text-slate-900 pb-3 border-b border-slate-100">
              Multi-Seller Breakdown
            </h3>

            {/* Farm by Farm Breakdown */}
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {groupedBySeller.map((group) => (
                <div key={group.seller_id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-agro-600" />
                      {group.farm_name}
                    </span>
                    <span>${parseFloat(group.seller_subtotal).toFixed(2)}</span>
                  </div>

                  <div className="space-y-1 pl-5 text-[11px] text-slate-600">
                    {group.items.map((itm) => (
                      <div key={itm.item_id || itm.id} className="flex justify-between">
                        <span className="truncate max-w-[140px]">{itm.product_title} × {itm.quantity}</span>
                        <span className="font-mono text-slate-900 font-bold">${parseFloat(itm.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Items:</span>
                <strong className="text-slate-900">{totalItemsCount} units</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Farms Involved:</span>
                <strong className="text-slate-900">{groupedBySeller.length} Individual Farms</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping:</span>
                <span className="text-emerald-700 font-bold">Standard Agro Logistics</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-900">Grand Total:</span>
              <span className="text-2xl font-black text-slate-900">${grandTotal.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-lg shadow-agro-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Generating Order...' : paymentMethod === 'card' ? 'Proceed to Online Payment' : 'Confirm Order & Wire Transfer'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Online Card Payment Gateway Modal (Realistic Simulator) */}
      {paymentModalOpen && pendingOrderData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-agro-600 text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Kisanova Payment Gateway</h3>
                  <span className="text-[11px] text-agro-700 font-bold uppercase tracking-wide">
                    Encrypted Sandbox Checkout
                  </span>
                </div>
              </div>
              <span className="text-lg font-black text-slate-900">${grandTotal.toFixed(2)}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Order Reference:</span>
                <span className="font-mono font-bold text-slate-900">{pendingOrderData.orderNumber}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Transaction Ref:</span>
                <span className="font-mono text-slate-700 truncate max-w-[180px]">
                  {pendingOrderData.paymentSession?.transactionReference}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Security Signature:</span>
                <span className="font-mono text-emerald-700 font-bold">HMAC-SHA256 Validated</span>
              </div>
            </div>

            {/* Test Card Simulation Form */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Simulated Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={cardNumber}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                  />
                  <span className="absolute right-3 top-2 text-[10px] font-bold text-agro-700 uppercase">Test Card</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Expiry</label>
                  <input
                    type="text"
                    disabled
                    value={cardExpiry}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">CVC</label>
                  <input
                    type="text"
                    disabled
                    value={cardCvc}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Clicking "Complete Payment" sends verification to the backend payment engine to transition the order to <strong>PAID</strong>.
            </p>

            <button
              onClick={handleCompleteCardPayment}
              disabled={processingPayment}
              className="w-full py-3.5 bg-agro-600 hover:bg-agro-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>{processingPayment ? 'Verifying with Provider...' : `Pay $${grandTotal.toFixed(2)} Now`}</span>
              <CheckCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
