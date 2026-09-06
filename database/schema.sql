-- =======================================================
-- KISANOVA AGRICULTURAL MARKETPLACE - DATABASE SCHEMA
-- =======================================================

CREATE DATABASE IF NOT EXISTS kisanova_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kisanova_db;

-- Drop tables in reverse dependency order for clean migrations
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS seller_profile_audits;
DROP TABLE IF EXISTS seller_payouts;
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
SET FOREIGN_KEY_CHECKS = 1;

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
-- -------------------------------------------------------
-- 2. SELLERS (Farm / Merchant Profile)
-- -------------------------------------------------------
CREATE TABLE sellers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    farm_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NULL,
    region VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    tehsil VARCHAR(100) NULL,
    village VARCHAR(150) NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    seller_declared_area_acres DECIMAL(10, 2) NULL,
    calculated_polygon_area_acres DECIMAL(10, 2) NULL,
    farm_polygon JSON NULL,
    logo_url VARCHAR(500) NULL,
    business_info TEXT NULL,
    profile_image VARCHAR(500) NULL,
    bio TEXT NULL,
    delivery_available BOOLEAN DEFAULT TRUE,
    pickup_available BOOLEAN DEFAULT TRUE,
    estimated_delivery_min_days INT DEFAULT 2,
    estimated_delivery_max_days INT DEFAULT 4,
    delivery_fee DECIMAL(10, 2) DEFAULT 300.00,
    pickup_instructions TEXT NULL,
    payout_method VARCHAR(50) DEFAULT 'BANK_ACCOUNT',
    payout_account_title VARCHAR(150) NULL,
    payout_account_number VARCHAR(100) NULL,
    payout_bank_name VARCHAR(100) NULL,
    payout_status ENUM('UNCONFIGURED', 'PENDING_VERIFICATION', 'VERIFIED') DEFAULT 'UNCONFIGURED',
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVIEW_REQUIRED') NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT NULL,
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
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
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
    currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
    fulfillment_method ENUM('DELIVERY', 'PICKUP') NOT NULL DEFAULT 'DELIVERY',
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    estimated_delivery_min_days INT NULL,
    estimated_delivery_max_days INT NULL,
    pickup_instructions TEXT NULL,
    amount_due DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_remaining DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    delivery_name VARCHAR(120) NOT NULL,
    delivery_phone VARCHAR(30) NOT NULL,
    delivery_address TEXT NULL, -- Nullable for Farm Gate Pickup
    delivery_notes TEXT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'COD', -- 'COD', 'FARM_PICKUP'
    payment_status ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
    order_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'
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
    fulfillment_method ENUM('DELIVERY', 'PICKUP') NOT NULL DEFAULT 'DELIVERY',
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_due DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_remaining DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'COD', -- 'COD', 'FARM_PICKUP'
    payment_status ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'
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
    seller_id INT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'COD', -- 'COD', 'FARM_PICKUP'
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_remaining DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
    proof_url VARCHAR(500) NULL, -- for physical COD receipt / delivery slip upload
    admin_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_payment_order (order_id),
    INDEX idx_payment_status (status),
    INDEX idx_payment_receipt (receipt_number)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 13. SELLER PAYOUTS (Settlement Handling)
-- -------------------------------------------------------
CREATE TABLE seller_payouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
    payout_method VARCHAR(50) NOT NULL,
    payout_destination VARCHAR(150) NOT NULL,
    payout_model ENUM('MERCHANT_SETTLEMENT', 'MARKETPLACE_SPLIT') NOT NULL DEFAULT 'MERCHANT_SETTLEMENT',
    status ENUM('PENDING', 'PROCESSING', 'SETTLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    reference_id VARCHAR(100) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE RESTRICT,
    INDEX idx_seller_payouts_seller (seller_id),
    INDEX idx_seller_payouts_status (status)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 14. SELLER PROFILE AUDITS (Auditability for Sensitive Edits)
-- -------------------------------------------------------
CREATE TABLE seller_profile_audits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    changed_by INT NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    triggered_reverification BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_profile_audits_seller (seller_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 15. NOTIFICATIONS (Real-Time In-App Alerts)
-- -------------------------------------------------------
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    seller_id INT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'NEW_ORDER',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_unread (user_id, is_read)
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 16. PASSWORD RESETS (Secure OTP Management)
-- -------------------------------------------------------
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    reset_token_hash VARCHAR(64) NOT NULL,
    token_expires_at DATETIME NOT NULL,
    attempts INT DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pwd_resets_email (email),
    INDEX idx_pwd_resets_token_hash (reset_token_hash)
) ENGINE=InnoDB;

