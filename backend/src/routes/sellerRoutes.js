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
  updateSellerOrderPaymentStatus,
  getSellerProfile,
  updateSellerProfile,
  uploadMediaFile
} = require('../controllers/sellerController');
const { requireAuth, requireApprovedSeller } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(requireAuth);

// Direct media upload for farm logo, profile images, and certificates
router.post('/upload-media', upload.single('file'), uploadMediaFile);

router.use(requireApprovedSeller);

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
router.put('/orders/:id/payment-status', updateSellerOrderPaymentStatus);

module.exports = router;
