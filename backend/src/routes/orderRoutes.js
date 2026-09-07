const express = require('express');
const router = express.Router();
const { checkout, getBuyerOrders, getOrderDetails } = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { authenticatedLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const {
  checkoutSchema,
  getOrdersQuerySchema,
  orderIdParamSchema
} = require('../validators/orderSchemas');

router.use(requireAuth);
router.use(authenticatedLimiter);

router.post('/checkout', requireRole('BUYER', 'ADMIN'), validate({ body: checkoutSchema }), checkout);
router.get('/', requireRole('BUYER', 'ADMIN'), validate({ query: getOrdersQuerySchema }), getBuyerOrders);
router.get('/:id', validate({ params: orderIdParamSchema }), getOrderDetails);

module.exports = router;
