import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ShieldCheck, Truck, Clock, HeartHandshake, ArrowRight } from 'lucide-react';

const PublicFooter = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      {/* Value Proposition Highlights */}
      <div className="border-b border-slate-800 py-10 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-agro-900/60 border border-agro-700/50 flex items-center justify-center text-agro-400 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">100% Verified Sellers</h4>
              <p className="text-xs text-slate-400 mt-1">Every farmer profile and listing is verified by agricultural authorities.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-agro-900/60 border border-agro-700/50 flex items-center justify-center text-agro-400 flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Multi-Seller Delivery</h4>
              <p className="text-xs text-slate-400 mt-1">Purchase from multiple independent farms in a single seamless checkout.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-agro-900/60 border border-agro-700/50 flex items-center justify-center text-agro-400 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Direct Farm-to-Buyer Chat</h4>
              <p className="text-xs text-slate-400 mt-1">Real-time messaging with photo & video updates direct from harvest fields.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-agro-900/60 border border-agro-700/50 flex items-center justify-center text-agro-400 flex-shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Transparent Farm Prices</h4>
              <p className="text-xs text-slate-400 mt-1">Zero middlemen markups. Fair returns for cultivators and honest wholesale rates.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-agro-600 flex items-center justify-center text-white">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              KISAN<span className="text-agro-400">OVA</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Kisanova is a next-generation agricultural trading platform connecting certified cultivators, grain farmers, and produce growers directly with buyers nationwide.
          </p>
          <div className="pt-2">
            <Link
              to="/seller/register"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-agro-600 hover:bg-agro-500 text-white text-xs font-bold transition-colors shadow-sm"
            >
              <span>Sell on Kisanova</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Marketplace */}
        <div>
          <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">Marketplace</h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/products" className="hover:text-agro-400 transition-colors">All Crops & Produce</Link></li>
            <li><Link to="/products?category=Grains%20%26%20Cereals" className="hover:text-agro-400 transition-colors">Grains & Cereals</Link></li>
            <li><Link to="/products?category=Fruits%20%26%20Vegetables" className="hover:text-agro-400 transition-colors">Fruits & Vegetables</Link></li>
            <li><Link to="/products?category=Organic%20Produce" className="hover:text-agro-400 transition-colors">Organic Honey & Herbs</Link></li>
            <li><Link to="/products?category=Cash%20Crops" className="hover:text-agro-400 transition-colors">Cash Crops & Cotton</Link></li>
          </ul>
        </div>

        {/* Farmer Portal & Resources */}
        <div>
          <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">Cultivator Hub</h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/seller/register" className="text-agro-400 hover:text-agro-300 font-semibold transition-colors">Apply as Verified Farmer</Link></li>
            <li><Link to="/seller/login" className="hover:text-agro-400 transition-colors">Farmer / Seller Login</Link></li>
            <li><Link to="/faqs" className="hover:text-agro-400 transition-colors">How Selling Works</Link></li>
            <li><Link to="/terms" className="hover:text-agro-400 transition-colors">Crop Quality & Dispatch Rules</Link></li>
          </ul>
        </div>

        {/* Support & Legal */}
        <div>
          <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">Customer Support & Legal</h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/faqs" className="hover:text-agro-400 transition-colors">Frequently Asked Questions (FAQs)</Link></li>
            <li><Link to="/privacy" className="hover:text-agro-400 transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-agro-400 transition-colors">Terms of Service</Link></li>
            <li><span className="text-slate-500">Logistics & Escrow Support</span></li>
          </ul>
          <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
            All agricultural listings adhere to national quality and sanitation standards.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Kisanova Agricultural Technologies Inc. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default PublicFooter;
