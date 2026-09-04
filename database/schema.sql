-- =======================================================
-- KISANOVA AGRICULTURAL MARKETPLACE - DATABASE SCHEMA
-- =======================================================

CREATE DATABASE IF NOT EXISTS kisanova_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kisanova_db;

-- Drop tables in reverse dependency order for clean migrations
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS seller_orders;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS sellers;
DROP TABLE IF EXISTS users;

-- -------------------------------------------------------
-- 1. USERS
-- -------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('BUYER', 'SELLER', 'ADMIN') NOT NULL DEFAULT 'BUYER',
    status ENUM('ACTIVE', 'SUSPENDED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    avatar_url VARCHAR(500) NULL,
    phone VARCHAR(30) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 2. SELLERS (Farm / Merchant Profile)
-- -------------------------------------------------------
CREATE TABLE sellers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    farm_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address TEXT NOT NULL,
    bio TEXT NULL,
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_seller_approval (approval_status)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 3. PRODUCTS
-- -------------------------------------------------------
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    crop_type VARCHAR(100) NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'kg', -- kg, bag, crate, bushel, liter, ton
    available_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
    INDEX idx_product_category (category),
    INDEX idx_product_status (status),
    INDEX idx_product_seller (seller_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 4. PRODUCT IMAGES
-- -------------------------------------------------------
CREATE TABLE product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_images_product (product_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 5. CARTS
-- -------------------------------------------------------
CREATE TABLE carts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 6. CART ITEMS (Multi-seller items in a single cart)
-- -------------------------------------------------------
CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    seller_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    price_snapshot DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_product (cart_id, product_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 7. ORDERS (Parent Order for Checkout)
-- -------------------------------------------------------
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    buyer_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_name VARCHAR(120) NOT NULL,
    delivery_phone VARCHAR(30) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_notes TEXT NULL,
    payment_status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    order_status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_order_buyer (buyer_id),
    INDEX idx_order_number (order_number),
    INDEX idx_order_payment_status (payment_status)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 8. SELLER ORDERS (Sub-orders per seller)
-- -------------------------------------------------------
CREATE TABLE seller_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    seller_id INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE RESTRICT,
    INDEX idx_seller_orders_seller (seller_id),
    INDEX idx_seller_orders_order (order_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 9. ORDER ITEMS
-- -------------------------------------------------------
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (seller_order_id) REFERENCES seller_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 10. CONVERSATIONS (Buyer & Seller Chat)
-- -------------------------------------------------------
CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    product_id INT NOT NULL,
    order_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    INDEX idx_conv_buyer (buyer_id),
    INDEX idx_conv_seller (seller_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 11. MESSAGES (Text, Images, Videos)
-- -------------------------------------------------------
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_type ENUM('TEXT', 'IMAGE', 'VIDEO') NOT NULL DEFAULT 'TEXT',
    text_content TEXT NULL,
    media_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_msg_conv (conversation_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 12. PAYMENTS
-- -------------------------------------------------------
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'sandbox', -- 'sandbox', 'stripe', 'bank_transfer'
    transaction_reference VARCHAR(150) NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'card', -- 'card', 'bank_transfer', 'wallet'
    proof_url VARCHAR(500) NULL, -- for manual bank transfer proof upload
    admin_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_payment_order (order_id),
    INDEX idx_payment_status (status)
) ENGINE=InnoDB;
