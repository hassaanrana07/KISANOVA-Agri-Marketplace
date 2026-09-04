const pool = require('../config/db');

/**
 * Get Public Approved Products with Filters & Search
 */
const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      crop_type,
      minPrice,
      maxPrice,
      sort = 'newest',
      page = 1,
      limit = 12
    } = req.query;

    let whereClauses = ["p.status = 'APPROVED'", "s.approval_status = 'APPROVED'"];
    let queryParams = [];

    if (search) {
      whereClauses.push('(p.title LIKE ? OR p.description LIKE ? OR p.crop_type LIKE ? OR s.farm_name LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (category && category !== 'All') {
      whereClauses.push('p.category = ?');
      queryParams.push(category);
    }

    if (crop_type) {
      whereClauses.push('p.crop_type = ?');
      queryParams.push(crop_type);
    }

    if (minPrice) {
      whereClauses.push('p.price >= ?');
      queryParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      whereClauses.push('p.price <= ?');
      queryParams.push(parseFloat(maxPrice));
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Sorting
    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'p.price ASC';
    if (sort === 'price_desc') orderBy = 'p.price DESC';
    if (sort === 'title_asc') orderBy = 'p.title ASC';

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const offset = (pageNum - 1) * limitNum;

    // Count query
    const [countResult] = await pool.query(
      `SELECT COUNT(DISTINCT p.id) as total
       FROM products p
       JOIN sellers s ON p.seller_id = s.id
       ${whereString}`,
      queryParams
    );

    const totalProducts = countResult[0].total;

    // Products query
    const [products] = await pool.query(
      `SELECT 
         p.id, p.seller_id, p.title, p.category, p.crop_type, p.description,
         p.price, p.unit, p.available_quantity, p.status, p.created_at,
         s.farm_name, s.phone as seller_phone, s.address as seller_address,
         COALESCE(
           (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1),
           'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80'
         ) as primary_image
       FROM products p
       JOIN sellers s ON p.seller_id = s.id
       ${whereString}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    );

    return res.json({
      success: true,
      data: {
        products,
        pagination: {
          total: totalProducts,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalProducts / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products.'
    });
  }
};

/**
 * Get Product Categories with Counts
 */
const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      `SELECT p.category, COUNT(p.id) as product_count
       FROM products p
       JOIN sellers s ON p.seller_id = s.id
       WHERE p.status = 'APPROVED' AND s.approval_status = 'APPROVED'
       GROUP BY p.category
       ORDER BY product_count DESC`
    );

    return res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories.'
    });
  }
};

/**
 * Get Single Product Details by ID
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const [products] = await pool.query(
      `SELECT 
         p.id, p.seller_id, p.title, p.category, p.crop_type, p.description,
         p.price, p.unit, p.available_quantity, p.status, p.created_at,
         s.user_id as seller_user_id, s.farm_name, s.phone as seller_phone, 
         s.address as seller_address, s.bio as seller_bio, s.approval_status as seller_approval,
         u.name as seller_name, u.email as seller_email
       FROM products p
       JOIN sellers s ON p.seller_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const product = products[0];

    // Fetch all images
    const [images] = await pool.query(
      'SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC',
      [id]
    );
    product.images = images.length > 0 ? images : [{
      id: 0,
      image_url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
      is_primary: true
    }];

    // Fetch related products in the same category
    const [related] = await pool.query(
      `SELECT 
         p.id, p.title, p.price, p.unit, p.category, s.farm_name,
         (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as primary_image
       FROM products p
       JOIN sellers s ON p.seller_id = s.id
       WHERE p.category = ? AND p.id != ? AND p.status = 'APPROVED'
       LIMIT 4`,
      [product.category, id]
    );

    return res.json({
      success: true,
      data: {
        product,
        related
      }
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product details.'
    });
  }
};

module.exports = {
  getProducts,
  getCategories,
  getProductById
};
