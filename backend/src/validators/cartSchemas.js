/**
 * Cart Endpoints Validation Schemas
 */

const addToCartSchema = {
  product_id: {
    type: 'positiveInt',
    required: true
  },
  quantity: {
    type: 'positiveInt',
    min: 1,
    max: 100000,
    required: true
  }
};

const updateCartItemBodySchema = {
  quantity: {
    type: 'positiveInt',
    min: 1,
    max: 100000,
    required: true
  }
};

const cartItemIdParamSchema = {
  itemId: {
    type: 'positiveInt',
    required: true
  }
};

module.exports = {
  addToCartSchema,
  updateCartItemBodySchema,
  cartItemIdParamSchema
};
