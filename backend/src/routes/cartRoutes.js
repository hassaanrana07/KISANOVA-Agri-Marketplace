const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} = require('../controllers/cartController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { authenticatedLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const {
  addToCartSchema,
  updateCartItemBodySchema,
  cartItemIdParamSchema
} = require('../validators/cartSchemas');

router.use(requireAuth);
router.use(authenticatedLimiter);
router.use(requireRole('BUYER', 'ADMIN'));

router.get('/', getCart);
router.post('/', validate({ body: addToCartSchema }), addToCart);
router.put('/:itemId', validate({ params: cartItemIdParamSchema, body: updateCartItemBodySchema }), updateCartItem);
router.delete('/:itemId', validate({ params: cartItemIdParamSchema }), removeCartItem);
router.delete('/', clearCart);

module.exports = router;
