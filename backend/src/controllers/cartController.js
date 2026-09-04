const pool = require('../config/db');

/**
 * Get or create cart for authenticated buyer
 */
const getOrCreateCartId = async (buyerId) => {
  const [carts] = await pool.query('SELECT id FROM carts WHERE buyer_id = ?', [buyerId]);
  if (carts.length > 0) {
    return carts[0].id;
  }
  const [result] = await pool.query('INSERT INTO carts (buyer_id) VALUES (?)', [buyerId]);
  return result.insertId;
};

/**
 * Get Buyer's Multi-Seller Cart
 */
const getCart = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const cartId = await getOrCreateCartId(buyerId);

    const [items] = await pool.query(
      `SELECT 
         ci.id as item_id,
         ci.product_id,
         ci.seller_id,
         ci.quantity,
         ci.price_snapshot,
         p.title as product_title,
         p.category as product_category,
         p.unit as product_unit,
         p.price as current_price,
         p.available_quantity as stock,
         p.status as product_status,
         s.farm_name,
         s.phone as seller_phone,
         s.address as seller_address,
         COALESCE(
           (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1),
           'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=300&q=80'
         ) as image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       JOIN sellers s ON ci.seller_id = s.id
       WHERE ci.cart_id = ?
       ORDER BY s.farm_name ASC, ci.created_at DESC`,
      [cartId]
    );

    // Group items by seller
    const sellersMap = {};
    let grandTotal = 0;
    let totalItemsCount = 0;

    items.forEach((item) => {
      const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.current_price);
      grandTotal += itemSubtotal;
      totalItemsCount += parseFloat(item.quantity);

      if (!sellersMap[item.seller_id]) {
        sellersMap[item.seller_id] = {
          seller_id: item.seller_id,
          farm_name: item.farm_name,
          seller_phone: item.seller_phone,
          seller_address: item.seller_address,
          seller_subtotal: 0,
          items: []
        };
      }

      sellersMap[item.seller_id].seller_subtotal += itemSubtotal;
      sellersMap[item.seller_id].items.push({
        ...item,
        subtotal: itemSubtotal
      });
    });

    const groupedBySeller = Object.values(sellersMap);

    return res.json({
      success: true,
      data: {
        cart_id: cartId,
        items,
        groupedBySeller,
        totalItemsCount,
        grandTotal: parseFloat(grandTotal.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cart.'
    });
  }
};

/**
 * Add Product to Cart
 */
const addToCart = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required.'
      });
    }

    const qty = Math.max(1, parseFloat(quantity));

    // Verify product exists and is APPROVED
    const [products] = await pool.query(
      `SELECT p.id, p.seller_id, p.price, p.available_quantity, p.status, s.approval_status
       FROM products p
       JOIN sellers s ON p.seller_id = s.id
       WHERE p.id = ?`,
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const product = products[0];
    if (product.status !== 'APPROVED' || product.approval_status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'This product is currently not available for purchase.'
      });
    }

    if (parseFloat(product.available_quantity) < qty) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.available_quantity} units available in stock.`
      });
    }

    const cartId = await getOrCreateCartId(buyerId);

    // Check if item already exists in cart
    const [existing] = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cartId, product_id]
    );

    if (existing.length > 0) {
      const newQty = parseFloat(existing[0].quantity) + qty;
      if (newQty > parseFloat(product.available_quantity)) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more. Total in cart would exceed stock (${product.available_quantity}).`
        });
      }

      await pool.query(
        'UPDATE cart_items SET quantity = ?, price_snapshot = ? WHERE id = ?',
        [newQty, product.price, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot)
         VALUES (?, ?, ?, ?, ?)`,
        [cartId, product_id, product.seller_id, qty, product.price]
      );
    }

    return res.json({
      success: true,
      message: 'Product added to cart successfully.'
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add item to cart.'
    });
  }
};

/**
 * Update Cart Item Quantity
 */
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const buyerId = req.user.id;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity greater than zero is required.'
      });
    }

    // Verify ownership through cart
    const [items] = await pool.query(
      `SELECT ci.id, ci.product_id, p.available_quantity, p.price
       FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = ? AND c.buyer_id = ?`,
      [itemId, buyerId]
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.'
      });
    }

    const item = items[0];
    if (qty > item.available_quantity) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock (${item.available_quantity}).`
      });
    }

    await pool.query(
      'UPDATE cart_items SET quantity = ?, price_snapshot = ? WHERE id = ?',
      [qty, item.price, itemId]
    );

    return res.json({
      success: true,
      message: 'Cart updated successfully.'
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update cart.'
    });
  }
};

/**
 * Remove Single Item from Cart
 */
const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const buyerId = req.user.id;

    const [result] = await pool.query(
      `DELETE ci FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = ? AND c.buyer_id = ?`,
      [itemId, buyerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Item removed from cart.'
    });
  } catch (error) {
    console.error('Error removing cart item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove item.'
    });
  }
};

/**
 * Clear Entire Cart
 */
const clearCart = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const [carts] = await pool.query('SELECT id FROM carts WHERE buyer_id = ?', [buyerId]);
    if (carts.length > 0) {
      await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
    }

    return res.json({
      success: true,
      message: 'Cart emptied successfully.'
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear cart.'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};
