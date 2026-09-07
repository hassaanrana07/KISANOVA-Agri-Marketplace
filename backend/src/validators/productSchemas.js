/**
 * Product Endpoints Validation Schemas
 */

const getProductsQuerySchema = {
  category: {
    type: 'string',
    max: 100,
    required: false
  },
  category_id: {
    type: 'positiveInt',
    required: false
  },
  search: {
    type: 'string',
    max: 200,
    required: false
  },
  min_price: {
    type: 'number',
    min: 0,
    max: 10000000,
    required: false
  },
  max_price: {
    type: 'number',
    min: 0,
    max: 10000000,
    required: false
  },
  sort: {
    type: 'string',
    enum: ['price_asc', 'price_desc', 'newest', 'oldest', 'rating', 'popular'],
    required: false
  },
  page: {
    type: 'positiveInt',
    min: 1,
    max: 10000,
    required: false
  },
  limit: {
    type: 'positiveInt',
    min: 1,
    max: 100,
    required: false
  }
};

const productIdParamSchema = {
  id: {
    type: 'positiveInt',
    required: true
  }
};

module.exports = {
  getProductsQuerySchema,
  productIdParamSchema
};
