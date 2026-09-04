const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
  getSellerProfile,
  updateSellerProfile
} = require('../controllers/sellerController');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(requireAuth);
router.use(requireRole('SELLER'));

router.get('/dashboard', getDashboardMetrics);
router.get('/profile', getSellerProfile);
router.put('/profile', updateSellerProfile);

router.get('/products', getSellerProducts);
router.post('/products', upload.array('images', 5), createProduct);
router.put('/products/:id', upload.array('images', 5), updateProduct);
router.delete('/products/:id', deleteProduct);

router.get('/orders', getSellerOrders);
router.get('/orders/:id', getSellerOrderById);
router.put('/orders/:id/status', updateSellerOrderStatus);

module.exports = router;
