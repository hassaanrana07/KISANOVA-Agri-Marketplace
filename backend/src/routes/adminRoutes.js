const express = require('express');
const router = express.Router();
const {
  getAdminMetrics,
  getSellers,
  updateSellerApproval,
  getAdminProducts,
  updateProductStatus,
  getAdminOrders,
  verifyBankTransfer,
  getUsers,
  updateUserStatus
} = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/metrics', getAdminMetrics);

// Seller management
router.get('/sellers', getSellers);
router.put('/sellers/:id/approval', updateSellerApproval);

// Product management
router.get('/products', getAdminProducts);
router.put('/products/:id/status', updateProductStatus);

// Order & Payment management
router.get('/orders', getAdminOrders);
router.put('/payments/:paymentId/verify', verifyBankTransfer);

// User management
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);

module.exports = router;
