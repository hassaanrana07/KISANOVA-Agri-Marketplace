/**
 * KISANOVA - Seed Script
 * Populates database with demo users, sellers, products, multi-seller orders, and chat conversations.
 */

const path = require('path');
const mysql = require(path.join(__dirname, '../backend/node_modules/mysql2/promise'));
const bcrypt = require(path.join(__dirname, '../backend/node_modules/bcryptjs'));
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kisanova_db',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function seed() {
  console.log('🌱 Starting Kisanova Database Seeding...');
  const conn = await mysql.createConnection(dbConfig);

  try {
    // Disable FK checks temporarily for truncate/clear
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE payments');
    await conn.query('TRUNCATE TABLE messages');
    await conn.query('TRUNCATE TABLE conversations');
    await conn.query('TRUNCATE TABLE order_items');
    await conn.query('TRUNCATE TABLE seller_orders');
    await conn.query('TRUNCATE TABLE orders');
    await conn.query('TRUNCATE TABLE cart_items');
    await conn.query('TRUNCATE TABLE carts');
    await conn.query('TRUNCATE TABLE product_images');
    await conn.query('TRUNCATE TABLE products');
    await conn.query('TRUNCATE TABLE sellers');
    await conn.query('TRUNCATE TABLE users');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Cleaned previous records');

    // 1. Hash Passwords
    const adminPass = await bcrypt.hash('Admin@123456', 10);
    const sellerPass = await bcrypt.hash('Seller@123456', 10);
    const buyerPass = await bcrypt.hash('Buyer@123456', 10);

    // 2. Insert Users
    const [adminUser] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role, status, phone) 
       VALUES (?, ?, ?, 'ADMIN', 'ACTIVE', '+1 800-555-0199')`,
      ['Marketplace Administrator', 'admin@kisanova.com', adminPass]
    );

    const [sellerUser1] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role, status, phone) 
       VALUES (?, ?, ?, 'SELLER', 'ACTIVE', '+1 555-234-5678')`,
      ['Ramesh Patel', 'seller1@kisanova.com', sellerPass]
    );

    const [sellerUser2] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role, status, phone) 
       VALUES (?, ?, ?, 'SELLER', 'ACTIVE', '+1 555-876-5432')`,
      ['Ananya Sharma', 'seller2@kisanova.com', sellerPass]
    );

    const [sellerUser3] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role, status, phone) 
       VALUES (?, ?, ?, 'SELLER', 'ACTIVE', '+1 555-345-6789')`,
      ['Tariq Mahmood', 'seller3@kisanova.com', sellerPass]
    );

    const [buyerUser1] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role, status, phone) 
       VALUES (?, ?, ?, 'BUYER', 'ACTIVE', '+1 555-901-2345')`,
      ['Zainab Ali', 'buyer1@kisanova.com', buyerPass]
    );

    const [buyerUser2] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role, status, phone) 
       VALUES (?, ?, ?, 'BUYER', 'ACTIVE', '+1 555-678-9012')`,
      ['David Miller', 'buyer2@kisanova.com', buyerPass]
    );

    console.log('✅ Inserted users (1 Admin, 3 Sellers, 2 Buyers)');

    // 3. Insert Sellers Profiles with Geolocation & Business Information
    const [seller1] = await conn.query(
      `INSERT INTO sellers (user_id, farm_name, phone, address, city, region, latitude, longitude, business_info, bio, approval_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')`,
      [
        sellerUser1.insertId,
        'Green Valley Farms',
        '+92 300 2345678',
        'Sector 4, Indus Valley Agro Corridor, Jhang Road',
        'Faisalabad',
        'Punjab',
        31.4504,
        73.1350,
        'Certified organic heirloom grain producer with solar-powered drip irrigation and moisture-controlled grain silos.',
        'Specializing in organic non-GMO heirloom wheat, aromatic long-grain basmati, and raw comb honey. Farming responsibly with solar-powered irrigation.'
      ]
    );

    const [seller2] = await conn.query(
      `INSERT INTO sellers (user_id, farm_name, phone, address, city, region, latitude, longitude, business_info, bio, approval_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')`,
      [
        sellerUser2.insertId,
        'Golden Harvest Organics',
        '+92 321 8765432',
        'Plot 18, Royal Orchard Belt, Old Shujabad Road',
        'Multan',
        'Punjab',
        30.1575,
        71.5249,
        'Third-generation fruit and vegetable cultivators with modern cold storage and Global GAP agricultural hygiene certification.',
        'Generations of fruit cultivators harvesting sun-kissed Alphonso mangoes, fresh vine tomatoes, and crisp red storage onions. Global GAP certified.'
      ]
    );

    const [seller3] = await conn.query(
      `INSERT INTO sellers (user_id, farm_name, phone, address, city, region, latitude, longitude, business_info, bio, approval_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        sellerUser3.insertId,
        'Sunrise Agro Commodities',
        '+92 333 3456789',
        'Highway 12, Riverbend Farm District, Rohri Bypass',
        'Sukkur',
        'Sindh',
        27.7052,
        68.8574,
        'Commercial agricultural cooperative supplying certified long-staple cotton and cold-pressed oilseeds across nationwide industrial mills.',
        'New agricultural cooperative applying for marketplace approval to distribute bulk organic cotton bales and cold-pressed sunflower oil.'
      ]
    );

    console.log('✅ Inserted seller profiles (2 Approved, 1 Pending for Admin review)');

    // 4. Products Data (Immediate ACTIVE status for approved sellers)
    const productsData = [
      {
        seller_id: seller1.insertId,
        title: 'Golden Amber Durum Wheat (Grade A)',
        category: 'Grains & Cereals',
        crop_type: 'Durum Wheat',
        description: 'Naturally sun-cured, triple-cleaned high protein durum wheat suitable for gourmet pasta, artisanal bread, and bulk grain milling. Low moisture content (<11%) guarantees long shelf stability.',
        price: 42.00,
        unit: 'bag (50kg)',
        available_quantity: 450,
        status: 'ACTIVE',
        images: [
          'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        seller_id: seller1.insertId,
        title: 'Super Kernel Basmati Rice (Aged 2 Years)',
        category: 'Grains & Cereals',
        crop_type: 'Basmati Rice',
        description: 'Exceptional aromatic long-grain Basmati rice aged for 24 months to develop exquisite fragrance and non-sticky cooking perfection. Average grain length exceeds 8.4mm upon cooking.',
        price: 65.00,
        unit: 'bag (25kg)',
        available_quantity: 280,
        status: 'ACTIVE',
        images: [
          'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        seller_id: seller1.insertId,
        title: 'Raw Organic Wildflower Honey',
        category: 'Organic Produce',
        crop_type: 'Raw Honey',
        description: 'Unfiltered, unpasteurized honey harvested from bee apiaries situated beside organic clover and wild mustard fields. Rich in natural pollens and enzymes.',
        price: 18.50,
        unit: 'jar (1kg)',
        available_quantity: 120,
        status: 'ACTIVE',
        images: [
          'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        seller_id: seller1.insertId,
        title: 'Premium Long-Staple Raw Cotton (Ginned)',
        category: 'Cash Crops',
        crop_type: 'Cotton',
        description: 'Export grade long-staple cotton ginned to remove trash and seed. Ideal for textile spinning mills and cotton processing operations.',
        price: 135.00,
        unit: 'bale (170kg)',
        available_quantity: 35,
        status: 'ACTIVE',
        images: [
          'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        seller_id: seller2.insertId,
        title: 'Fresh Ratnagiri Alphonso Mangoes',
        category: 'Fruits & Vegetables',
        crop_type: 'Alphonso Mango',
        description: 'The undisputed King of Mangoes. Naturally tree-ripened, hand-picked Alphonso mangoes characterized by creamy saffron pulp, intense tropical aroma, and thin peel.',
        price: 38.00,
        unit: 'crate (5kg)',
        available_quantity: 150,
        status: 'ACTIVE',
        images: [
          'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        seller_id: seller2.insertId,
        title: 'Crisp Organic Red Onions',
        category: 'Fruits & Vegetables',
        crop_type: 'Red Onion',
        description: 'Hard, cured red onions with glossy crimson skin and pungent aromatic flavor. Grown using vermicompost and zero chemical pesticides. Excellent 4-month storage resilience.',
        price: 26.00,
        unit: 'sack (25kg)',
        available_quantity: 320,
        status: 'ACTIVE',
        images: [
          'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        seller_id: seller2.insertId,
        title: 'Vine-Ripened Roma Tomatoes',
        category: 'Fruits & Vegetables',
        crop_type: 'Roma Tomato',
        description: 'Plump, firm oval Roma tomatoes grown under protected polyhouse conditions. Dense flesh with low seed count, ideal for fresh salads, sauces, and culinary processing.',
        price: 22.00,
        unit: 'crate (12kg)',
        available_quantity: 210,
        status: 'ACTIVE',
        images: [
          'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        seller_id: seller2.insertId,
        title: 'Pure Farm Cow Milk (A2 Gir Cow)',
        category: 'Dairy & Farm',
        crop_type: 'Dairy',
        description: 'Fresh, chilled morning whole milk sourced exclusively from indigenous pastured Gir cows. High butterfat (4.5%), free from synthetic hormones or antibiotics.',
        price: 6.50,
        unit: 'bottle (2L)',
        available_quantity: 80,
        status: 'ACTIVE',
        images: [
          'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'
        ]
      }
    ];

    const insertedProductIds = [];

    for (const p of productsData) {
      const [res] = await conn.query(
        `INSERT INTO products (seller_id, title, category, crop_type, description, price, unit, available_quantity, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.seller_id, p.title, p.category, p.crop_type, p.description, p.price, p.unit, p.available_quantity, p.status]
      );
      insertedProductIds.push(res.insertId);

      for (let i = 0; i < p.images.length; i++) {
        await conn.query(
          `INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)`,
          [res.insertId, p.images[i], i === 0]
        );
      }
    }

    console.log(`✅ Inserted ${productsData.length} agricultural products with image galleries`);

    // 5. Create Carts for Buyers
    await conn.query(`INSERT INTO carts (buyer_id) VALUES (?)`, [buyerUser1.insertId]);
    await conn.query(`INSERT INTO carts (buyer_id) VALUES (?)`, [buyerUser2.insertId]);

    // 6. Create Seed Multi-Seller Order (Demonstration of Multi-Seller Checkout)
    // Order 1: Cash on Delivery (COD - PAID upon delivery)
    const orderNum1 = 'KSN-' + Math.floor(100000 + Math.random() * 900000);
    const [parentOrder1] = await conn.query(
      `INSERT INTO orders 
        (order_number, buyer_id, total_amount, currency, fulfillment_method, delivery_fee, 
         amount_due, amount_paid, amount_remaining, delivery_name, delivery_phone, delivery_address, 
         payment_method, payment_status, order_status)
       VALUES (?, ?, 198.00, 'PKR', 'DELIVERY', 0.00, 198.00, 198.00, 0.00, 'Zainab Ali', '+92 301 9012345', '742 Canal View Gardens, Sector B, Lahore', 'COD', 'PAID', 'PROCESSING')`,
      [orderNum1, buyerUser1.insertId]
    );

    // Sub-order 1 for Seller 1 (Green Valley Farms)
    const [subOrder1] = await conn.query(
      `INSERT INTO seller_orders 
        (order_id, seller_id, subtotal, fulfillment_method, delivery_fee, amount_due, amount_paid, amount_remaining, payment_method, payment_status, status)
       VALUES (?, ?, 84.00, 'DELIVERY', 0.00, 84.00, 84.00, 0.00, 'COD', 'PAID', 'PROCESSING')`,
      [parentOrder1.insertId, seller1.insertId]
    );

    await conn.query(
      `INSERT INTO order_items (seller_order_id, product_id, quantity, unit_price, subtotal)
       VALUES (?, ?, 2, 42.00, 84.00)`,
      [subOrder1.insertId, insertedProductIds[0]]
    );

    // Sub-order 2 for Seller 2 (Golden Harvest Organics)
    const [subOrder2] = await conn.query(
      `INSERT INTO seller_orders 
        (order_id, seller_id, subtotal, fulfillment_method, delivery_fee, amount_due, amount_paid, amount_remaining, payment_method, payment_status, status)
       VALUES (?, ?, 114.00, 'DELIVERY', 0.00, 114.00, 114.00, 0.00, 'COD', 'PAID', 'CONFIRMED')`,
      [parentOrder1.insertId, seller2.insertId]
    );

    await conn.query(
      `INSERT INTO order_items (seller_order_id, product_id, quantity, unit_price, subtotal)
       VALUES (?, ?, 3, 38.00, 114.00)`,
      [subOrder2.insertId, insertedProductIds[4]]
    );

    // Payment record for Order 1
    await conn.query(
      `INSERT INTO payments 
        (order_id, payment_method, receipt_number, amount, currency, amount_paid, amount_remaining, status)
       VALUES (?, 'COD', ?, 198.00, 'PKR', 198.00, 0.00, 'PAID')`,
      [parentOrder1.insertId, `REC-${parentOrder1.insertId}-${Date.now().toString().slice(-6)}`]
    );

    // Seed Order 2: Buyer 2 buys Onions from Seller 2 via Cash on Delivery (COD - UNPAID)
    const orderNum2 = 'KSN-' + Math.floor(100000 + Math.random() * 900000);
    const [parentOrder2] = await conn.query(
      `INSERT INTO orders 
        (order_number, buyer_id, total_amount, currency, fulfillment_method, delivery_fee, 
         amount_due, amount_paid, amount_remaining, delivery_name, delivery_phone, delivery_address, 
         payment_method, payment_status, order_status)
       VALUES (?, ?, 52.00, 'PKR', 'DELIVERY', 0.00, 52.00, 0.00, 52.00, 'David Miller', '+92 345 6789012', '45 Market Avenue, Grain Terminal District, Rawalpindi', 'COD', 'UNPAID', 'PENDING')`,
      [orderNum2, buyerUser2.insertId]
    );

    const [subOrder3] = await conn.query(
      `INSERT INTO seller_orders 
        (order_id, seller_id, subtotal, fulfillment_method, delivery_fee, amount_due, amount_paid, amount_remaining, payment_method, payment_status, status)
       VALUES (?, ?, 52.00, 'DELIVERY', 0.00, 52.00, 0.00, 52.00, 'COD', 'UNPAID', 'PENDING')`,
      [parentOrder2.insertId, seller2.insertId]
    );

    await conn.query(
      `INSERT INTO order_items (seller_order_id, product_id, quantity, unit_price, subtotal)
       VALUES (?, ?, 2, 26.00, 52.00)`,
      [subOrder3.insertId, insertedProductIds[5]]
    );

    // Payment record for Order 2 (Cash on Delivery pending courier collection)
    await conn.query(
      `INSERT INTO payments 
        (order_id, payment_method, receipt_number, amount, currency, amount_paid, amount_remaining, status, admin_notes)
       VALUES (?, 'COD', ?, 52.00, 'PKR', 0.00, 52.00, 'UNPAID', 'Cash on Delivery - to be collected by courier upon arrival')`,
      [parentOrder2.insertId, `REC-${parentOrder2.insertId}-${Date.now().toString().slice(-6)}`]
    );

    console.log('✅ Created multi-seller demonstration orders with payment records');

    // 7. Seed Chat Conversation
    const [conv1] = await conn.query(
      `INSERT INTO conversations (buyer_id, seller_id, product_id, order_id)
       VALUES (?, ?, ?, ?)`,
      [buyerUser1.insertId, seller2.insertId, insertedProductIds[4], parentOrder1.insertId]
    );

    await conn.query(
      `INSERT INTO messages (conversation_id, sender_id, message_type, text_content)
       VALUES (?, ?, 'TEXT', 'Hello Ananya! How soon can the Alphonso mango crate be dispatched to North District?')`,
      [conv1.insertId, buyerUser1.insertId]
    );

    await conn.query(
      `INSERT INTO messages (conversation_id, sender_id, message_type, text_content)
       VALUES (?, ?, 'TEXT', 'Hello Zainab! We harvested a fresh batch this morning. Your order is confirmed and will ship early tomorrow with cold-chain packaging.')`,
      [conv1.insertId, sellerUser2.insertId]
    );

    await conn.query(
      `INSERT INTO messages (conversation_id, sender_id, message_type, media_url, text_content)
       VALUES (?, ?, 'IMAGE', 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80', 'Here is a photo of the morning harvest crates ready for sorting.')`,
      [conv1.insertId, sellerUser2.insertId]
    );

    console.log('✅ Seeded buyer-to-seller chat conversation with text and image messages');
    console.log('🎉 Kisanova Database Seeding Complete!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
