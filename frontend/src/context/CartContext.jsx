import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { isAuthenticated, isBuyer } = useAuth();
  const [items, setItems] = useState([]);
  const [groupedBySeller, setGroupedBySeller] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load cart on auth change
  useEffect(() => {
    if (isAuthenticated && isBuyer) {
      fetchBackendCart();
    } else {
      loadGuestCart();
    }
  }, [isAuthenticated, isBuyer]);

  const calculateTotals = (cartItems) => {
    let total = 0;
    let count = 0;
    const sellersMap = {};

    cartItems.forEach((item) => {
      const price = parseFloat(item.current_price || item.price || item.price_snapshot);
      const qty = parseFloat(item.quantity);
      const sub = price * qty;

      total += sub;
      count += qty;

      const sellerId = item.seller_id;
      if (!sellersMap[sellerId]) {
        sellersMap[sellerId] = {
          seller_id: sellerId,
          farm_name: item.farm_name,
          seller_phone: item.seller_phone,
          seller_address: item.seller_address,
          seller_subtotal: 0,
          items: []
        };
      }

      sellersMap[sellerId].seller_subtotal += sub;
      sellersMap[sellerId].items.push({
        ...item,
        subtotal: sub
      });
    });

    setItems(cartItems);
    setGroupedBySeller(Object.values(sellersMap));
    setGrandTotal(parseFloat(total.toFixed(2)));
    setTotalItemsCount(count);
  };

  const loadGuestCart = () => {
    const saved = localStorage.getItem('kisanova_guest_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        calculateTotals(parsed);
      } catch (e) {
        setItems([]);
      }
    } else {
      setItems([]);
      setGroupedBySeller([]);
      setGrandTotal(0);
      setTotalItemsCount(0);
    }
  };

  const fetchBackendCart = async () => {
    setLoading(true);
    try {
      // First, if there was a guest cart before logging in, sync items to backend
      const guestCart = localStorage.getItem('kisanova_guest_cart');
      if (guestCart) {
        let parsedGuest = [];
        try {
          parsedGuest = JSON.parse(guestCart);
        } catch (parseErr) {
          console.error('Invalid guest cart JSON in localStorage:', parseErr);
        }
        const failedItems = [];
        if (Array.isArray(parsedGuest)) {
          for (const itm of parsedGuest) {
            try {
              await api.post('/cart', { product_id: itm.product_id, quantity: itm.quantity });
            } catch (e) {
              console.warn(`Failed to sync guest cart item ${itm.product_id} to backend:`, e?.response?.data?.message || e.message);
              failedItems.push(itm);
            }
          }
        }
        if (failedItems.length > 0) {
          localStorage.setItem('kisanova_guest_cart', JSON.stringify(failedItems));
        } else {
          localStorage.removeItem('kisanova_guest_cart');
        }
      }

      const res = await api.get('/cart');
      if (res.data.success) {
        setItems(res.data.data.items || []);
        setGroupedBySeller(res.data.data.groupedBySeller || []);
        setGrandTotal(res.data.data.grandTotal || 0);
        setTotalItemsCount(res.data.data.totalItemsCount || 0);
      }
    } catch (err) {
      console.error('Error fetching backend cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product, quantity = 1) => {
    const qty = Math.max(1, parseFloat(quantity));

    if (isAuthenticated && isBuyer) {
      try {
        const res = await api.post('/cart', {
          product_id: product.id,
          quantity: qty
        });
        if (res.data.success) {
          await fetchBackendCart();
          return { success: true };
        }
        return { success: false, message: res.data.message };
      } catch (err) {
        return {
          success: false,
          message: err.response?.data?.message || 'Failed to add item to cart.'
        };
      }
    } else {
      // Guest local storage cart
      const current = [...items];
      const existingIndex = current.findIndex(i => (i.product_id || i.id) === product.id);

      if (existingIndex >= 0) {
        current[existingIndex].quantity = parseFloat(current[existingIndex].quantity) + qty;
      } else {
        current.push({
          item_id: 'guest-' + Date.now(),
          product_id: product.id,
          seller_id: product.seller_id,
          product_title: product.title,
          product_unit: product.unit,
          current_price: product.price,
          price: product.price,
          stock: product.available_quantity,
          farm_name: product.farm_name,
          seller_phone: product.seller_phone,
          seller_address: product.seller_address,
          image_url: product.primary_image || (product.images && product.images[0]?.image_url),
          quantity: qty
        });
      }

      localStorage.setItem('kisanova_guest_cart', JSON.stringify(current));
      calculateTotals(current);
      return { success: true };
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    const qty = parseFloat(quantity);
    if (qty <= 0) return removeFromCart(itemId);

    if (isAuthenticated && isBuyer) {
      try {
        await api.put(`/cart/${itemId}`, { quantity: qty });
        await fetchBackendCart();
        return { success: true };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || 'Failed to update quantity.' };
      }
    } else {
      const current = items.map(item => {
        if (item.item_id === itemId || item.id === itemId) {
          return { ...item, quantity: qty };
        }
        return item;
      });
      localStorage.setItem('kisanova_guest_cart', JSON.stringify(current));
      calculateTotals(current);
      return { success: true };
    }
  };

  const removeFromCart = async (itemId) => {
    if (isAuthenticated && isBuyer) {
      try {
        await api.delete(`/cart/${itemId}`);
        await fetchBackendCart();
        return { success: true };
      } catch (err) {
        return { success: false, message: err.response?.data?.message || 'Failed to remove item.' };
      }
    } else {
      const current = items.filter(item => item.item_id !== itemId && item.id !== itemId);
      localStorage.setItem('kisanova_guest_cart', JSON.stringify(current));
      calculateTotals(current);
      return { success: true };
    }
  };

  const clearCart = async () => {
    if (isAuthenticated && isBuyer) {
      try {
        await api.delete('/cart');
        setItems([]);
        setGroupedBySeller([]);
        setGrandTotal(0);
        setTotalItemsCount(0);
      } catch (err) {
        console.error('Failed to clear backend cart:', err);
      }
    } else {
      localStorage.removeItem('kisanova_guest_cart');
      setItems([]);
      setGroupedBySeller([]);
      setGrandTotal(0);
      setTotalItemsCount(0);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        groupedBySeller,
        grandTotal,
        totalItemsCount,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart: fetchBackendCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
