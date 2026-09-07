/**
 * Seller Endpoints Validation Schemas
 */

const updateSellerProfileSchema = {
  farm_name: {
    type: 'string',
    min: 2,
    max: 200,
    required: false
  },
  phone: {
    type: 'string',
    format: 'phone',
    min: 7,
    max: 25,
    required: false
  },
  address: {
    type: 'string',
    min: 3,
    max: 500,
    required: false
  },
  city: {
    type: 'string',
    max: 100,
    required: false
  },
  region: {
    type: 'string',
    max: 100,
    required: false
  },
  province: {
    type: 'string',
    max: 100,
    required: false
  },
  district: {
    type: 'string',
    max: 100,
    required: false
  },
  tehsil: {
    type: 'string',
    max: 100,
    required: false
  },
  village: {
    type: 'string',
    max: 100,
    required: false
  },
  latitude: {
    type: 'number',
    min: -90,
    max: 90,
    required: false
  },
  longitude: {
    type: 'number',
    min: -180,
    max: 180,
    required: false
  },
  seller_declared_area_acres: {
    type: 'number',
    min: 0,
    max: 100000,
    required: false
  },
  calculated_polygon_area_acres: {
    type: 'number',
    min: 0,
    max: 100000,
    required: false
  },
  farm_polygon: {
    required: false
  },
  business_info: {
    type: 'string',
    max: 2000,
    required: false
  },
  bio: {
    type: 'string',
    max: 2000,
    required: false
  },
  logo_url: {
    type: 'string',
    max: 1000,
    required: false
  },
  profile_image: {
    type: 'string',
    max: 1000,
    required: false
  },
  delivery_available: {
    type: 'boolean',
    required: false
  },
  pickup_available: {
    type: 'boolean',
    required: false
  },
  delivery_fee: {
    type: 'number',
    min: 0,
    max: 100000,
    required: false
  },
  estimated_delivery_min_days: {
    type: 'integer',
    min: 0,
    max: 365,
    required: false
  },
  estimated_delivery_max_days: {
    type: 'integer',
    min: 0,
    max: 365,
    required: false
  },
  pickup_instructions: {
    type: 'string',
    max: 1000,
    required: false
  }
};

const createProductSchema = {
  title: {
    type: 'string',
    min: 2,
    max: 200,
    required: true
  },
  category: {
    type: 'string',
    min: 2,
    max: 100,
    required: true
  },
  crop_type: {
    type: 'string',
    max: 100,
    required: false
  },
  description: {
    type: 'string',
    min: 5,
    max: 5000,
    required: true
  },
  price: {
    type: 'number',
    min: 0.01,
    max: 10000000,
    required: true
  },
  unit: {
    type: 'string',
    min: 1,
    max: 50,
    required: true
  },
  available_quantity: {
    type: 'number',
    min: 0,
    max: 10000000,
    required: false
  },
  image_urls: {
    required: false
  }
};

const updateProductSchema = {
  title: {
    type: 'string',
    min: 2,
    max: 200,
    required: false
  },
  category: {
    type: 'string',
    min: 2,
    max: 100,
    required: false
  },
  crop_type: {
    type: 'string',
    max: 100,
    required: false
  },
  description: {
    type: 'string',
    min: 5,
    max: 5000,
    required: false
  },
  price: {
    type: 'number',
    min: 0.01,
    max: 10000000,
    required: false
  },
  unit: {
    type: 'string',
    min: 1,
    max: 50,
    required: false
  },
  available_quantity: {
    type: 'number',
    min: 0,
    max: 10000000,
    required: false
  },
  status: {
    type: 'string',
    enum: ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'],
    required: false
  },
  image_urls: {
    required: false
  }
};

const updateSellerOrderStatusSchema = {
  status: {
    type: 'string',
    enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
    required: true
  }
};

const updateSellerPaymentStatusSchema = {
  payment_status: {
    type: 'string',
    enum: ['UNPAID', 'PAID'],
    required: true
  }
};

const sellerIdParamSchema = {
  id: {
    type: 'positiveInt',
    required: true
  }
};

module.exports = {
  updateSellerProfileSchema,
  createProductSchema,
  updateProductSchema,
  updateSellerOrderStatusSchema,
  updateSellerPaymentStatusSchema,
  sellerIdParamSchema
};
