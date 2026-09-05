import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Sprout, ShoppingBag, Truck, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    category: 'Ordering & Delivery',
    icon: ShoppingBag,
    questions: [
      {
        q: 'How does multi-seller checkout work on Kisanova?',
        a: 'You can add crops from multiple independent farms (e.g. Basmati Rice from Punjab and Alphonso Mangoes from Sindh) into one unified cart. When you checkout, Kisanova automatically generates dedicated sub-orders for each farm so each cultivator can prepare and ship their specific harvest directly to you.'
      },
      {
        q: 'What payment methods are supported for crop orders?',
        a: 'We support Cash on Delivery (COD) for domestic courier dispatches, as well as instant Online Payments via Easypaisa, JazzCash, and SadaPay mobile wallets. All digital payments are protected with instant cryptographic verification.'
      },
      {
        q: 'Can I chat directly with the farmer before purchasing?',
        a: 'Yes! On every product detail page, you can click "Chat with Farmer" to initiate a real-time message thread. You can inquire about crop moisture, seed varieties, organic certifications, and ask for live photos/videos of the harvest.'
      }
    ]
  },
  {
    category: 'Farmers & Selling',
    icon: Sprout,
    questions: [
      {
        q: 'How do I register as a seller on Kisanova?',
        a: 'Click "Sell on Kisanova" or "Apply as Verified Farmer". Submit your farm name, district, contact number, CNIC/ID, and drop a pin on our interactive Leaflet map to mark your farm location. Once submitted, your application is reviewed by our administration team.'
      },
      {
        q: 'Why is my seller account under review?',
        a: 'To safeguard agricultural buyers against fraudulent brokers, all new seller accounts are manually vetted by Kisanova administrators. Once approved, you can log in, manage inventory, and list products immediately.'
      },
      {
        q: 'Do my products require admin approval every time I publish?',
        a: 'No! Once your seller account is verified and approved by the Kisanova administration, all products you publish go live immediately with ACTIVE status and are immediately searchable by buyers worldwide.'
      }
    ]
  },
  {
    category: 'Logistics & Safety',
    icon: Truck,
    questions: [
      {
        q: 'How do I verify the farmer\'s physical farm location?',
        a: 'Every verified product page displays an interactive OpenStreetMap view showing the farmer\'s harvest fields and coordinates, along with city and address details. You can even open the coordinates directly in Google Maps for satellite road routing.'
      },
      {
        q: 'Can sellers print official receipts for delivered orders?',
        a: 'Yes! Inside the Seller Panel under Customer Orders, sellers can view complete order breakdown slips and print official payment and dispatch receipts for their delivery records.'
      }
    ]
  }
];

const FaqPage = () => {
  const [openItems, setOpenItems] = useState({ '0-0': true, '1-0': true });

  const toggle = (catIdx, qIdx) => {
    const key = `${catIdx}-${qIdx}`;
    setOpenItems((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agro-50 border border-agro-200 text-agro-700 text-xs font-bold uppercase tracking-wider">
          <HelpCircle className="w-4 h-4" />
          Frequently Asked Questions
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">How Kisanova Works</h1>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto">
          Everything you need to know about buying fresh agricultural harvests, verifying sellers, and selling your crops directly.
        </p>
      </div>

      {/* FAQ Groups */}
      <div className="space-y-8">
        {FAQS.map((group, catIdx) => {
          const Icon = group.icon;
          return (
            <div key={group.category} className="space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-lg border-b border-slate-200 pb-2">
                <div className="w-8 h-8 rounded-lg bg-agro-100 text-agro-700 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h3>{group.category}</h3>
              </div>

              <div className="space-y-3">
                {group.questions.map((faq, qIdx) => {
                  const key = `${catIdx}-${qIdx}`;
                  const isOpen = !!openItems[key];
                  return (
                    <div
                      key={faq.q}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-colors"
                    >
                      <button
                        onClick={() => toggle(catIdx, qIdx)}
                        className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-semibold text-slate-900 text-sm">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-agro-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Still Have Questions CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-agro-700 to-agro-800 text-white p-8 text-center space-y-4 shadow-lg">
        <h3 className="text-xl font-bold">Have more questions about our platform?</h3>
        <p className="text-xs sm:text-sm text-agro-100 max-w-xl mx-auto">
          Our agricultural trade support team is here to assist both buyers and registered farmers 7 days a week.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/products"
            className="px-5 py-2.5 rounded-xl bg-white text-agro-900 font-bold text-xs hover:bg-agro-50 transition-colors shadow"
          >
            Browse Products
          </Link>
          <Link
            to="/seller/register"
            className="px-5 py-2.5 rounded-xl bg-agro-900/60 hover:bg-agro-900 border border-agro-400/40 text-white font-bold text-xs transition-colors"
          >
            Sell on Kisanova
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;
