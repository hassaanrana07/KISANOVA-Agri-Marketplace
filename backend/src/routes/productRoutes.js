const express = require('express');
const router = express.Router();
const { getProducts, getCategories, getProductById } = require('../controllers/productController');
const { publicLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const { getProductsQuerySchema, productIdParamSchema } = require('../validators/productSchemas');

router.use(publicLimiter);

router.get('/', validate({ query: getProductsQuerySchema }), getProducts);
router.get('/categories', getCategories);
router.get('/:id', validate({ params: productIdParamSchema }), getProductById);

module.exports = router;
