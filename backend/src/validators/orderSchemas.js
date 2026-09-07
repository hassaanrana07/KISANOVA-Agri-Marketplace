/**
 * Order Endpoints Validation Schemas
 */

const checkoutSchema = {
  delivery_name: {
    type: 'string',
    min: 2,
    max: 100,
    required: true
  },
  delivery_phone: {
    type: 'string',
    format: 'phone',
    min: 7,
    max: 25,
    required: true
  },
  delivery_address: {
    type: 'string',
    min: 3,
    max: 500,
    required: false
  },
  delivery_notes: {
    type: 'string',
    max: 1000,
    required: false
  },
  fulfillment_method: {
    type: 'string',
    enum: ['DELIVERY', 'PICKUP'],
    required: false
  },
  seller_fulfillments: {
    type: 'object',
    required: false
  },
  paymentMethod: {
    type: 'string',
    enum: ['COD'],
    required: false
  },
  payment_method: {
    type: 'string',
    enum: ['COD'],
    required: false
  }
};

const getOrdersQuerySchema = {
  status: {
    type: 'string',
    enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
    required: false
  },
  page: {
    type: 'positiveInt',
    min: 1,
    max: 1000,
    required: false
  },
  limit: {
    type: 'positiveInt',
    min: 1,
    max: 100,
    required: false
  }
};

const orderIdParamSchema = {
  id: {
    type: 'positiveInt',
    required: true
  }
};

module.exports = {
  checkoutSchema,
  getOrdersQuerySchema,
  orderIdParamSchema
};
