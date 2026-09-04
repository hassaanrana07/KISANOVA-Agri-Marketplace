const express = require('express');
const router = express.Router();
const { checkout, getBuyerOrders, getOrderDetails } = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.post('/checkout', requireRole('BUYER', 'ADMIN'), checkout);
router.get('/', requireRole('BUYER', 'ADMIN'), getBuyerOrders);
router.get('/:id', getOrderDetails);

module.exports = router;
