/**
 * Payment Endpoints Validation Schemas
 */

const orderIdParamSchema = {
  orderId: {
    type: 'positiveInt',
    required: true
  }
};

module.exports = {
  orderIdParamSchema
};
