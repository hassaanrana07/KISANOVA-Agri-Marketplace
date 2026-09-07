const express = require('express');
const router = express.Router();
const {
  getAdminMetrics,
  getSellers,
  updateSellerApproval,
  getAdminProducts,
  updateProductStatus,
  getAdminOrders,
  getUsers,
  updateUserStatus
} = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { authenticatedLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const {
  updateSellerApprovalSchema,
  updateProductStatusSchema,
  updateUserStatusSchema,
  adminIdParamSchema
} = require('../validators/adminSchemas');

router.use(requireAuth);
router.use(authenticatedLimiter);
router.use(requireAdmin);

router.get('/metrics', getAdminMetrics);

// Seller management
router.get('/sellers', getSellers);
router.put('/sellers/:id/approval', validate({ params: adminIdParamSchema, body: updateSellerApprovalSchema }), updateSellerApproval);

// Product management
router.get('/products', getAdminProducts);
router.put('/products/:id/status', validate({ params: adminIdParamSchema, body: updateProductStatusSchema }), updateProductStatus);

// Order management (COD & Farm Gate Pickup)
router.get('/orders', getAdminOrders);

// User management
router.get('/users', getUsers);
router.put('/users/:id/status', validate({ params: adminIdParamSchema, body: updateUserStatusSchema }), updateUserStatus);

module.exports = router;
