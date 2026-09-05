import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const URDU_DICTIONARY = {
  // Navigation & Shell
  'nav.dashboard': 'ڈیش بورڈ',
  'nav.products': 'فصل کا ذخیرہ',
  'nav.orders': 'گاہکوں کے آرڈرز',
  'nav.messages': 'خریداروں کے پیغامات',
  'nav.profile': 'فارم پروفائل',
  'nav.logout': 'لاگ آؤٹ',
  'nav.portal_title': 'کسان پورٹل',
  'nav.verified_seller': 'تصدیق شدہ کسان',
  'nav.pending_review': 'زیرِ جائزہ',
  'nav.farm_under_review': 'فارم کا جائزہ جاری ہے',
  'nav.farm_under_review_desc': 'آپ کے فارم کا جائزہ لیا جا رہا ہے۔ منظوری کے بعد آپ کی فصلیں مارکیٹ میں نظر آئیں گی۔',
  'nav.toggle_menu': 'مینو کھولیں / بند کریں',
  'nav.admin_modules': 'انتظامی شعبہ جات',

  // Language switcher
  'lang.english': 'English',
  'lang.urdu': 'اردو',
  'lang.switch': 'زبان تبدیل کریں',

  // Common Actions
  'action.save': 'محفوظ کریں',
  'action.cancel': 'منسوخ کریں',
  'action.edit': 'ترمیم کریں',
  'action.delete': 'حذف کریں',
  'action.search': 'تلاش کریں',
  'action.manage': 'انتظام کریں',
  'action.update': 'تبدیل کریں',
  'action.refresh': 'تازہ کریں',
  'action.back': 'واپس جائیں',
  'action.view': 'دیکھیں',
  'action.print_receipt': 'رسید پرنٹ کریں',
  'action.chat': 'پیغام بھیجیں',
  'action.clear': 'صاف کریں',
  'action.confirm': 'تصدیق کریں',
  'action.upload_image': 'تصویر اپ لوڈ کریں',
  'action.add_product': 'نئی فصل شامل کریں',

  // Statuses
  'status.pending': 'زیر التواء',
  'status.confirmed': 'تصدیق شدہ',
  'status.processing': 'تیاری کے مرحلے میں',
  'status.shipped': 'روانہ کر دیا گیا',
  'status.delivered': 'پہنچ گیا',
  'status.cancelled': 'منسوخ شدہ',
  'status.unpaid': 'غیر ادا شدہ',
  'status.partially_paid': 'جزوی ادا شدہ',
  'status.paid': 'مکمل ادا شدہ',
  'status.active': 'فعال',
  'status.approved': 'منظور شدہ',

  // Farm Dashboard
  'dashboard.title': 'فارم ڈیش بورڈ',
  'dashboard.subtitle': 'فصلوں کی بکری، آرڈرز اور کیش وصولیوں کا لائیو جائزہ',
  'dashboard.total_orders': 'کل آرڈرز',
  'dashboard.pending_orders': 'زیر التواء آرڈرز',
  'dashboard.completed_orders': 'مکمل شدہ ترسیلات',
  'dashboard.total_revenue': 'کل فروخت',
  'dashboard.pending_revenue': 'بقایا کیش وصولی',
  'dashboard.active_products': 'فعال فصلیں',
  'dashboard.recent_orders': 'حالیہ آرڈرز',
  'dashboard.no_orders': 'ابھی تک کوئی کسٹمر آرڈر نہیں ملا۔',
  'dashboard.timeline_title': 'فصلوں کی بکری اور آرڈرز کا رجحان (پچھلے 14 دن)',
  'dashboard.status_distribution': 'آرڈرز کی صورتحال',
  'dashboard.cod_ledger': 'کیش آن ڈیلیوری کی صورتحال',

  // Products Page & Form
  'product.title': 'فصل کا نام',
  'product.category': 'زرعی زمرہ',
  'product.crop_type': 'فصل کی قسم / نباتاتی نسل',
  'product.price': 'قیمت فی یونٹ',
  'product.stock': 'دستیاب مقدار',
  'product.min_order': 'کم از کم آرڈر',
  'product.unit': 'پیمانہ / وزن',
  'product.unit_kg': 'کلوگرام (kg)',
  'product.unit_mann': 'من (40 کلو)',
  'product.unit_ton': 'ٹن (1000 کلو)',
  'product.unit_bag': 'بوری / تھیلا',
  'product.unit_crate': 'کریٹ / پیٹی',
  'product.harvest_date': 'تاریخِ کٹائی',
  'product.description': 'فصل کی خصوصیات اور تفصیل',
  'product.images': 'فصل کی تصاویر',
  'product.upload_hint': 'فصل کی واضح تصاویر لگائیں تاکہ خریدار معیار کا معائنہ کر سکے۔',
  'product.add_new': 'نئی پیداوار شامل کریں',
  'product.edit': 'فصل کی معلومات میں ترمیم',
  'product.delete_confirm': 'کیا آپ واقعی اس فصل کو حذف کرنا چاہتے ہیں؟',
  'product.no_products': 'آپ نے ابھی تک کوئی فصل درج نہیں کی۔ نئی فصل شامل کرنے کے لیے بٹن دبائیں۔',
  'product.category_grains': 'اناج اور دالیں',
  'product.category_fruits_veg': 'پھل اور سبزیاں',
  'product.category_organic': 'قدرتی اور نامیاتی پیداوار',
  'product.category_dairy': 'ڈیری اور فارم',
  'product.category_cash_crops': 'نقد آور فصلیں (کپاس، گنا وغیرہ)',
  'product.category_spices': 'مصالحہ جات اور جڑی بوٹیاں',
  'product.category_seeds': 'بیج اور پودے',
  'product.upload_photos': 'فصل کی تصاویر اپ لوڈ کرنے کے لیے کلک کریں',
  'product.or_image_url': 'یا تصویر کا انٹرنیٹ لنک درج کریں:',

  // Orders Page & Order Detail
  'order.number': 'آرڈر نمبر',
  'order.customer': 'خریدار کا نام',
  'order.phone': 'رابطہ نمبر',
  'order.address': 'ترسیل کا پتہ',
  'order.fulfillment': 'ترسیل کا طریقہ',
  'order.pickup': 'فارم سے خود وصولی',
  'order.delivery': 'فارم سے براہِ راست ترسیل',
  'order.notes': 'خریدار کی خصوصی ہدایات',
  'order.items': 'آرڈر میں شامل پیداوار',
  'order.total_value': 'کل آرڈر رقم',
  'order.amount_paid': 'وصول شدہ رقم',
  'order.amount_remaining': 'بقایا رقم',
  'order.cod_accounting': 'کیش آن ڈیلیوری کھاتہ',
  'order.cod_accounting_desc': 'اس آرڈر کی کیش وصولی اور بقایا جات کا ریکارڈ',
  'order.dispatch_stage': 'ترسیلی مرحلہ',
  'order.update_dispatch': 'ترسیل کا مرحلہ اپ ڈیٹ کریں',
  'order.cod_cash_collection': 'کیش کی وصولی',
  'order.partial_cash_label': 'وصول شدہ جزوی رقم (روپے)',
  'order.partial_cash_placeholder': 'وصول کی گئی رقم درج کریں',
  'order.update_payment': 'ادائیگی کی صورتحال تبدیل کریں',
  'order.no_orders': 'کوئی گاہک آرڈر موجود نہیں۔',

  // Farm Profile & Map
  'profile.title': 'فارم پروفائل اور ترتیبات',
  'profile.farm_name': 'فارم یا کاروبار کا نام',
  'profile.phone': 'موبائل نمبر',
  'profile.location_hierarchy': 'انتظامی علاقائی درجہ بندی',
  'profile.province': 'صوبہ',
  'profile.district': 'ضلع',
  'profile.tehsil': 'تحصیل',
  'profile.village': 'گاؤں / چک / قصبہ',
  'profile.custom_village': 'یا کسٹم گاؤں/ڈیرہ درج کریں',
  'profile.map_view': 'نقشہ',
  'profile.satellite_view': 'سیٹلائٹ',
  'profile.position_pin': 'مقام کا نشان لگائیں',
  'profile.draw_boundary': 'فارم کی حدود بنائیں',
  'profile.clear_boundary': 'حدود ختم کریں',
  'profile.my_gps': 'میری موجودہ لوکیشن',
  'profile.fullscreen': 'بڑی اسکرین',
  'profile.exit_fullscreen': 'چھوٹی اسکرین',
  'profile.search_location': 'شہر، گاؤں یا غلہ منڈی تلاش کریں...',
  'profile.nearby_mandis': 'قریبی زرعی منڈیاں اور مراکز',
  'profile.declared_acres': 'کسان کا درج کردہ رقبہ',
  'profile.acres_unit': 'ایکڑ',
  'profile.calculated_acres': 'نقشے کے مطابق پیمائش شدہ رقبہ',
  'profile.acres_official_hint': 'سرکاری پٹوار یا ملکیتی کاغذات کے مطابق رقبہ۔',
  'profile.delivery_available': 'خریدار تک ترسیل کی سہولت موجود ہے',
  'profile.pickup_available': 'فارم سے براہِ راست اٹھانے کی سہولت موجود ہے',
  'profile.delivery_fee': 'ترسیل کی فیس (روپے)',
  'profile.delivery_days_min': 'کم از کم ترسیلی دن',
  'profile.delivery_days_max': 'زیادہ سے زیادہ ترسیلی دن',
  'profile.pickup_instructions': 'فارم پر پہنچنے اور وصولی کی رہنمائی',
  'profile.payout_method': 'رقم کی منتقلی کا طریقہ',
  'profile.payout_account_title': 'بینک اکاؤنٹ یا موبائل والیٹ ٹائٹل',
  'profile.payout_account_number': 'اکاؤنٹ نمبر یا IBAN',
  'profile.payout_bank_name': 'بینک کا نام',
  'profile.save_profile': 'فارم پروفائل محفوظ کریں',
  'profile.saved_success': 'فارم کی معلومات اور رقبہ کامیابی کے ساتھ محفوظ ہو گیا۔',

  // Messages / Chat
  'chat.title': 'خریداروں کے پیغامات',
  'chat.search': 'بات چیت تلاش کریں...',
  'chat.placeholder': 'اپنا پیغام یہاں لکھیں...',
  'chat.send': 'بھیجیں',
  'chat.no_conversations': 'ابھی تک کوئی خریدار پیغام موصول نہیں ہوا۔',
  'chat.select_conversation': 'پیغامات دیکھنے کے لیے فہرست میں سے خریدار منتخب کریں۔'
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('agrilink_seller_lang') || 'en';
  });

  const isRTL = language === 'ur';
  const dir = isRTL ? 'rtl' : 'ltr';

  const setLanguage = (lang) => {
    const validLang = lang === 'ur' ? 'ur' : 'en';
    setLanguageState(validLang);
    localStorage.setItem('agrilink_seller_lang', validLang);
  };

  const t = (key, fallback = '') => {
    if (language === 'ur' && URDU_DICTIONARY[key]) {
      return URDU_DICTIONARY[key];
    }
    return fallback || key;
  };

  useEffect(() => {
    // Sync document language and dir attributes when in seller portal
    if (typeof window !== 'undefined') {
      const port = window.location.port;
      const path = window.location.pathname;
      if (port === '5140' || path.startsWith('/seller')) {
        document.documentElement.dir = dir;
        document.documentElement.lang = language;
      } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = 'en';
      }
    }
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL, dir, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Safe fallback if used outside LanguageProvider
    return {
      language: 'en',
      setLanguage: () => {},
      isRTL: false,
      dir: 'ltr',
      t: (key, fallback) => fallback || key
    };
  }
  return context;
};

export default LanguageContext;
