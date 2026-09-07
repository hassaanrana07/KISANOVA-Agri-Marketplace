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
const { upload, validateUploadedFiles } = require('../middleware/upload');
const { authenticatedLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const {
  updateSellerProfileSchema,
  createProductSchema,
  updateProductSchema,
  updateSellerOrderStatusSchema,
  updateSellerPaymentStatusSchema,
  sellerIdParamSchema
} = require('../validators/sellerSchemas');

router.use(requireAuth);
router.use(authenticatedLimiter);

// Direct media upload for farm logo, profile images, and certificates
router.post('/upload-media', upload.single('file'), validateUploadedFiles, uploadMediaFile);

router.use(requireApprovedSeller);

router.get('/dashboard', getDashboardMetrics);
router.get('/profile', getSellerProfile);
router.put('/profile', validate({ body: updateSellerProfileSchema }), updateSellerProfile);

router.get('/products', getSellerProducts);
router.post('/products', upload.array('images', 5), validateUploadedFiles, validate({ body: createProductSchema }), createProduct);
router.put('/products/:id', upload.array('images', 5), validateUploadedFiles, validate({ params: sellerIdParamSchema, body: updateProductSchema }), updateProduct);
router.delete('/products/:id', validate({ params: sellerIdParamSchema }), deleteProduct);

router.get('/orders', getSellerOrders);
router.get('/orders/:id', validate({ params: sellerIdParamSchema }), getSellerOrderById);
router.put('/orders/:id/status', validate({ params: sellerIdParamSchema, body: updateSellerOrderStatusSchema }), updateSellerOrderStatus);
router.put('/orders/:id/payment-status', validate({ params: sellerIdParamSchema, body: updateSellerPaymentStatusSchema }), updateSellerOrderPaymentStatus);

module.exports = router;
