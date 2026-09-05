# 🌾 KISANOVA — Agricultural Marketplace (کسان نووا زرعی منڈی)

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/GIS-Leaflet%20%2B%20Satellite-199900.svg)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Kisanova (کسان نووا)** is a production-grade, multi-seller agricultural marketplace engineered specifically for the Pakistani agricultural ecosystem. It connects verified farmers directly with commercial bulk buyers, food processors, and retail customers—eliminating exploitative middlemen commissions while providing transparent Cash on Delivery (COD) and Farm Gate Self-Pickup workflows, authentic bilingual Urdu RTL support, high-resolution satellite farm GIS mapping, and hardened enterprise application security.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Core Features & Functions](#-core-features--functions)
- [Hardened Enterprise Security](#-hardened-enterprise-security)
- [Technology Stack](#-technology-stack)
- [Project Folder Structure](#-project-folder-structure)
- [Database Schema & Migrations](#-database-schema--migrations)
- [Local Setup & Installation](#-local-setup--installation)
- [Environment Configuration](#-environment-configuration)
- [Dedicated Application Ports & Entry Points](#-dedicated-application-ports--entry-points)
- [Seed Test Credentials](#-seed-test-credentials)
- [Automated Verification & Testing](#-automated-verification--testing)
- [Deployment Guide](#-deployment-guide)
- [Contributing & License](#-contributing--license)

---

## 🏛️ Architectural Overview

Kisanova is architected around **three dedicated frontend user portals** powered by a unified **Node.js/Express REST API** and **real-time Socket.IO engine**:

```
                                  ┌──────────────────────────────────────────────┐
                                  │           Kisanova Client Systems            │
                                  └──────────────────────┬───────────────────────┘
                                                         │
             ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
             │                                           │                                           │
  ┌──────────▼──────────┐                     ┌──────────▼──────────┐                     ┌──────────▼──────────┐
  │  Public Marketplace │                     │    Seller Portal    │                     │    Admin Console    │
  │   (Port 5000: /)    │                     │  (Port 5140: /)     │                     │  (Port 5174: /)     │
  │ • Crop Catalog      │                     │ • English / اردو RTL│                     │ • Platform KPIs     │
  │ • Multi-Seller Cart │                     │ • Crop Inventory    │                     │ • Farm Audits       │
  │ • Direct Chat       │                     │ • Satellite GIS Map │                     │ • User Moderation   │
  │ • COD / Farm Pickup │                     │ • COD Ledger        │                     │ • 4 SVG Charts      │
  └──────────┬──────────┘                     └──────────┬──────────┘                     └──────────┬──────────┘
             │                                           │                                           │
             └───────────────────────────────────────────┼───────────────────────────────────────────┘
                                                         │ REST + Bearer JWT + Handshake WebSockets
                                                         ▼
                                      ┌──────────────────────────────────────┐
                                      │      Unified Backend (Port 8000)     │
                                      │  • Express REST API                  │
                                      │  • Socket.IO Real-Time Engine        │
                                      │  • Pure Token Password Reset         │
                                      │  • Sliding-Window Rate Limiter       │
                                      │  • Atomic Conditional Decrement      │
                                      │  • Strict COD & Farm Pickup Orders   │
                                      │  • Multi-Origin CORS Security        │
                                      └──────────────────┬───────────────────┘
                                                         │
                                                         ▼
                                      ┌──────────────────────────────────────┐
                                      │         MySQL Database (8.0)         │
                                      │             kisanova_db              │
                                      └──────────────────────────────────────┘
```

---

## 🌾 Core Features & Functions

### 1. Three Isolated Application Portals
- **Commercial Public Marketplace (`:5000`)**: Designed for buyers to discover fresh farm produce, browse categories (Grains, Fruits, Vegetables, Cotton, Dairy), communicate directly with farmers, and place multi-seller orders with Cash on Delivery or Farm Gate Self-Pickup.
- **Seller Backend Portal (`:5140`)**: Dedicated operational interface for farmers with farm profile customization, crop listing management, order dispatch pipeline, and financial settlement accounting.
- **Admin Governance Console (`:5174`)**: High-contrast administrative cockpit with real SVG visual analytics, seller verification audits, user management, and order governance.

### 2. Strict Cash on Delivery (COD) & Farm Gate Self-Pickup Only
- **Zero Third-Party Online Payment Baggage**: Credit card gateways, mobile wallet integrations, external payment webhooks, and sandbox mocks are completely removed.
- **Two Genuine Agricultural Fulfillment Modes**:
  1. **Cash on Delivery (COD)**: For courier-dispatched deliveries. Requires recipient delivery address, applies regional farm delivery fees, and settles cash upon physical delivery.
  2. **Farm Gate Self-Pickup (`FARM_PICKUP`)**: For buyers inspecting and loading produce directly at the farmer's fields. Delivery address is optional, delivery fee is 0 PKR, and payment is settled in-person on harvest collection.
- **Transparent COD Financial Ledger**:
  - **Total Order Value** (`amount_due` = subtotal + delivery fee)
  - **Cash Collected** (`amount_paid`)
  - **Outstanding Balance** (`amount_remaining`)
- **Order State Machine**:
  - *Delivery Workflow*: `PENDING` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED` (auto-marks `payment_status` as `PAID`).
  - *Farm Pickup Workflow*: `PENDING` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `READY_FOR_PICKUP` ➔ `PICKED_UP` (auto-marks `payment_status` as `PAID`).
  - Terminal statuses (`DELIVERED`, `PICKED_UP`, `CANCELLED`) are strictly immutable.

### 3. Pure Token-Based Password Reset (Zero Paid API Dependencies)
- **Standalone Cryptographic Token Mechanism**: Eliminates paid third-party SMS and email provider dependencies (e.g. Brevo) that break without live funded API keys.
- **32-Byte Cryptographic Hex Tokens**: Generated via `crypto.randomBytes(32)` (64-character hex string).
- **Secure MySQL Storage**: Token SHA-256 hash is stored in `password_resets` with a 15-minute expiration window.
- **Single-Use Enforcement**: Tokens are permanently marked `used = 1` immediately upon consumption, preventing replay attacks.
- **Developer Shortcut**: In development mode (`NODE_ENV !== 'production'`), reset tokens and direct links are output to the server console and frontend UI for seamless local testing.

### 4. Bilingual Seller Portal (English + Authentic Pakistani Urdu RTL)
- **Agricultural Urdu Vocabulary**: Comprehensive Urdu dictionary covering agricultural units (`من` / maund, `کلو` / kg, `بوری` / bag), COD accounting (`واجب الادا` / outstanding balance, `وصول شدہ` / collected), order stages, and farm details.
- **Dynamic RTL Layout**: Toggling Urdu updates `document.documentElement.dir = 'rtl'` and `lang = 'ur'`, mirroring the entire interface (right-sliding mobile drawer, mirrored chevrons, forms, and tables).
- **Persistent Selection**: Stores language choice in `localStorage` across page reloads.

### 5. Production Agricultural GIS Farm Map
- **Dual Map Layers**: Instant toggle between standard OpenStreetMap vector roads and high-resolution **Esri World Imagery Satellite** tiles (`ArcGIS/rest/services/World_Imagery/MapServer`) for inspecting fields and waterways.
- **True Fullscreen Mode**: Expands map to `100vw × 100vh` with Leaflet `map.invalidateSize()` reflow, preserving all polygon vertices and markers.
- **Debounced Location Search**: OpenStreetMap Nominatim geocoding restricted to Pakistan (`countrycodes=pk`) with live autocomplete suggestions.
- **Nearby Wholesale Mandis Discovery**: Farmers can discover proximity to Pakistan's major agricultural wholesale grain mandis (Lahore, Multan, Faisalabad, Sahiwal, Sargodha, Rahim Yar Khan, Hyderabad, Sukkur, Peshawar, Quetta) using Haversine geodesic distance calculation.
- **Polygon Acreage Calculation**: Spherical excess algorithm calculates exact farm acreage from polygon boundary coordinates and displays it alongside seller-declared acreage.

---

## 🛡️ Hardened Enterprise Security

Kisanova incorporates defense-in-depth architectural security patterns across every layer:

1. **Fail-Fast Production JWT Secrets**:
   - In `production` mode, the backend halts immediately if `JWT_SECRET` is missing, empty, or set to the default placeholder.
2. **Zero-Dependency Sliding-Window Rate Limiting**:
   - Protects `/api/auth/login` (10 requests / 15 min) and `/api/auth/forgot-password` (5 requests / 15 min).
   - Emits standard HTTP 429 Too Many Requests with `Retry-After` headers.
3. **Atomic Conditional Inventory Decrement**:
   - Prevents race conditions and overselling during simultaneous checkout attempts:
     ```sql
     UPDATE products 
     SET available_quantity = available_quantity - ? 
     WHERE id = ? AND available_quantity >= ?
     ```
   - If `affectedRows === 0`, the transaction rolls back immediately with HTTP 400 Insufficient Stock.
4. **Strict IDOR & Object Isolation**:
   - Buyers can only access their own orders and printable receipts (unauthorized attempts return HTTP 403 Forbidden).
   - Sellers can only access orders and metrics belonging to their own registered farm ID.
5. **Real Seller Financial Metrics**:
   - `grossOrderValue`, `cashCollected`, `pendingCodAmount`, and `farmPickupAmount` are computed directly from database records—fake mock refunds are completely eliminated.
6. **Upload Whitelist & Filename Sanitization**:
   - File extension & MIME whitelist: `.jpg`, `.jpeg`, `.png`, `.webp`, `.mp4`, `.webm` (25MB ceiling).
   - Dangerous extensions (`.php`, `.exe`, `.svg`, `.html`) are strictly rejected.
   - Filenames are randomized (`crypto.randomBytes(16)`) and sanitized against path-traversal attacks.
7. **Socket.IO Handshake Authentication & Room Access Control**:
   - Unauthenticated WebSocket connections without valid JWT Bearer tokens are rejected at the handshake layer.
   - Sockets join private user rooms (`user_${userId}`).
   - Joining conversation rooms (`conv_${conversationId}`) is restricted strictly to verified participants (buyer or seller).
8. **Frontend Route Guards**:
   - `RequireSellerAuth` and `RequireAdminAuth` components protect private seller and admin routes, preventing unauthenticated access or unauthorized role elevation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18 (Single Page Application via Vite 5) |
| **Styling & UI** | Tailwind CSS 3, Lucide React Icons |
| **GIS & Mapping** | Leaflet 1.9, React-Leaflet, Esri World Imagery Satellite, OpenStreetMap Nominatim |
| **State & Networking** | React Context API, Axios (with interceptors), Socket.IO Client |
| **Backend Framework** | Node.js (v18+ / v20+ / v24+), Express.js 4 |
| **Real-Time Communication**| Socket.IO Server (Authenticated Handshake) |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, Node `crypto` |
| **Database** | MySQL 8.0 with `mysql2` connection pooling & atomic ACID transactions |
| **File Storage** | Multer disk storage (`/uploads/`) with Cloudinary fallback |

---

## 📁 Project Folder Structure

```
KISANOVA/
├── backend/                             # Express REST API & Socket.IO Server
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                    # MySQL2 pool configuration
│   │   ├── controllers/
│   │   │   ├── adminController.js       # Admin KPIs, farm audits, user moderation
│   │   │   ├── authController.js        # Auth, token-based password reset, sessions
│   │   │   ├── cartController.js        # Multi-seller cart operations
│   │   │   ├── chatController.js        # Messaging & conversations
│   │   │   ├── notificationController.js# In-app notifications
│   │   │   ├── orderController.js       # COD & Farm Pickup checkout, tracking
│   │   │   ├── paymentController.js     # COD ledger & printable receipts
│   │   │   ├── productController.js     # Crop catalog & inventory
│   │   │   └── sellerController.js      # Farm profiles, state transitions, GIS
│   │   ├── middleware/
│   │   │   ├── auth.js                  # JWT validation & RBAC (ADMIN/SELLER/BUYER)
│   │   │   ├── rateLimiter.js           # Sliding-window in-memory rate limiter
│   │   │   └── upload.js                # Extension/MIME whitelist & sanitization
│   │   ├── routes/
│   │   │   ├── adminRoutes.js           # /api/admin/*
│   │   │   ├── authRoutes.js            # /api/auth/*
│   │   │   ├── cartRoutes.js            # /api/cart/*
│   │   │   ├── chatRoutes.js            # /api/chat/*
│   │   │   ├── notificationRoutes.js    # /api/notifications/*
│   │   │   ├── orderRoutes.js           # /api/orders/*
│   │   │   ├── paymentRoutes.js         # /api/payments/*
│   │   │   ├── productRoutes.js         # /api/products/*
│   │   │   └── sellerRoutes.js          # /api/seller/*
│   │   ├── services/
│   │   │   ├── paymentService.js        # COD settlement & receipt formatting
│   │   │   ├── socketService.js         # Socket.IO auth handshake & room dispatch
│   │   │   └── storageService.js        # Local & Cloudinary file persistence
│   │   ├── app.js                       # Express app configuration & CORS
│   │   └── server.js                    # Server startup on Port 8000
│   ├── uploads/                         # Local media uploads directory
│   ├── .env.example                     # Backend environment template
│   ├── package.json
│   └── test_v6.js                      # 41-assertion comprehensive verification suite
│
├── frontend/                            # React 18 SPA (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── FarmLocationMap.jsx   # Public farm map viewer with satellite toggle
│   │   │   │   ├── FarmLocationPicker.jsx# Interactive GIS editor (Satellite, Mandis, Area)
│   │   │   │   └── PrintableReceiptModal.jsx # Official COD printable invoice modal
│   │   │   └── public/
│   │   │       ├── PublicNavbar.jsx     # Buyer navigation bar
│   │   │       └── PublicFooter.jsx     # Marketplace footer
│   │   ├── context/
│   │   │   ├── AuthContext.jsx          # Session state & JWT management
│   │   │   └── LanguageContext.jsx      # English / authentic Urdu dictionary & RTL
│   │   ├── data/
│   │   │   └── pakistanLocations.js     # Provinces, districts, tehsils, and grain mandis
│   │   ├── layouts/
│   │   │   ├── AdminLayout.jsx          # Fixed sidebar & scrollable admin console
│   │   │   └── SellerLayout.jsx         # RTL-mirrored bilingual seller app shell
│   │   ├── pages/
│   │   │   ├── admin/                   # Admin pages (Dashboard, Sellers, Products, Orders, Users, Password Reset)
│   │   │   ├── public/                  # Public pages (Home, Products, Detail, Cart, Checkout, Chat, Password Reset)
│   │   │   └── seller/                  # Seller pages (Dashboard, Inventory, Orders, Detail, Profile, Password Reset)
│   │   ├── services/
│   │   │   ├── api.js                   # Axios client with JWT interceptor
│   │   │   └── socket.js                # Socket.IO client instance
│   │   ├── utils/
│   │   │   ├── currency.js              # Pakistani Rupee (PKR) formatting
│   │   │   └── gis.js                   # Haversine distance & polygon area calculations
│   │   ├── App.jsx                      # Port-aware routing & route guards (RequireSellerAuth, RequireAdminAuth)
│   │   ├── index.css                    # Tailwind CSS directives & custom styles
│   │   └── main.jsx                     # React DOM entry point
│   ├── .env.example                     # Frontend environment template
│   ├── package.json
│   └── vite.config.js                   # Multi-port Vite configuration (5000, 5140, 5174)
│
├── database/                            # Database definitions & migrations
│   ├── schema.sql                       # Complete MySQL DDL schema
│   ├── seed.js                          # Comprehensive demo data seeder
│   ├── migrate_v2.js                    # Agricultural location migration
│   ├── migrate_v3.js                    # Reset token & polygon acreage migration
│   └── migrate_v4.js                    # COD & Farm Pickup nullable address migration
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🗄️ Database Schema & Migrations

The database `kisanova_db` consists of normalized relational tables:

- **`users`**: Account identity with role (`ADMIN`, `SELLER`, `BUYER`) and status (`ACTIVE`, `SUSPENDED`).
- **`sellers`**: Farm profiles linked to users, containing farm location hierarchy (`province`, `district`, `tehsil`, `village`), coordinates (`latitude`, `longitude`), `farm_polygon` coordinates, `seller_declared_area_acres`, `calculated_polygon_area_acres`, delivery fees, and pickup terms.
- **`products`**: Crop listings with botanical categories, pricing per unit, stock quantity, and moderation status (`ACTIVE`, `INACTIVE`).
- **`product_images`**: Multi-photo gallery linked to products.
- **`carts` & `cart_items`**: Buyer carts supporting cross-farm multi-seller shopping with price snapshots.
- **`orders`**: Parent order recording delivery destination, total PKR amount, order status, and payment method (`COD` or `FARM_PICKUP`).
- **`seller_orders`**: Independent sub-orders generated per farm for granular dispatch and COD accounting (`amount_due`, `amount_paid`, `amount_remaining`, `status`, `payment_status`).
- **`order_items`**: Line items allocated to respective seller sub-orders.
- **`payments`**: Audit ledger recording transaction references, payment status (`UNPAID`, `PARTIALLY_PAID`, `PAID`), and payment method (`COD` or `FARM_PICKUP`).
- **`conversations` & `messages`**: Real-time buyer-seller chat threads with multimedia attachments.
- **`password_resets`**: Stores `reset_token_hash` (SHA-256), `expires_at`, and single-use `used` flag.
- **`notifications`**: In-app alerts for new orders and status updates.

---

## 🚀 Local Setup & Installation

### Prerequisites
- **Node.js**: v18.x, v20.x, or v24.x
- **npm**: v9.x or higher
- **MySQL Server**: v8.0 or higher (running on port 3306)
- **Git**

### Step 1: Clone the Repository
```bash
git clone https://github.com/hassaanrana07/KISANOVA-Agri-Marketplace.git
cd KISANOVA-Agri-Marketplace
```

### Step 2: Configure Environment Variables
Create the `.env` file for the backend:
```bash
cp backend/.env.example backend/.env
```

### Step 3: Initialize Database & Run Migrations
Ensure your MySQL service is running, then execute the schema and seed scripts:
```bash
# Initialize database schema
mysql -u root -p < database/schema.sql

# Run migrations (if upgrading existing database)
node database/migrate_v4.js

# Seed demo users, verified farms, crops, orders, and chat threads
node database/seed.js
```

### Step 4: Install Dependencies
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

---

## ⚙️ Environment Configuration

### Backend Environment (`backend/.env`)

```env
PORT=8000
NODE_ENV=development

# Frontend Application Origins (CORS)
PUBLIC_APP_URL=http://localhost:5000
SELLER_APP_URL=http://localhost:5140
ADMIN_APP_URL=http://localhost:5174
CLIENT_URL=http://localhost:5000,http://localhost:5140,http://localhost:5174,http://localhost:5173

# MySQL Database Connection
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=kisanova_db

# Security & Authentication
JWT_SECRET=kisanova_ultra_secure_jwt_secret_key_2026_farmers_market
JWT_EXPIRES_IN=7d

# App URL for Reset Links
APP_URL=http://localhost:5000

# Payment Service Configuration (Strict Cash on Delivery + Farm Gate Pickup)
PAYMENT_PROVIDER=cod_only

# Media Storage (Optional Cloudinary fallback)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=kisanova_media
```

---

## 🌐 Dedicated Application Ports & Entry Points

To run all applications concurrently in development:

| Command | Portal | Port | URL | Description |
| :--- | :--- | :--- | :--- | :--- |
| `node src/server.js` | **Backend API & Socket.IO** | `8000` | [`http://localhost:8000/api`](http://localhost:8000/api) | Express REST API & WebSockets |
| `npm run dev:public` | **Public Marketplace** | `5000` | [`http://localhost:5000`](http://localhost:5000) | Commercial buyer storefront |
| `npm run dev:seller` | **Seller Portal** | `5140` | [`http://localhost:5140`](http://localhost:5140) | English/Urdu RTL seller dashboard |
| `npm run dev:admin` | **Admin Console** | `5174` | [`http://localhost:5174`](http://localhost:5174) | Admin governance & audits |

---

## 🔑 Seed Test Credentials

The database seeder (`database/seed.js`) provisions ready-to-use demo accounts for immediate testing:

| Role | Name | Email | Password | Recommended Entry Point |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Marketplace Admin | `admin@kisanova.com` | `Admin@123456` | [`http://localhost:5174/login`](http://localhost:5174/login) |
| **Verified Farmer** | Green Valley Farms | `seller1@kisanova.com` | `Seller@123456` | [`http://localhost:5140/login`](http://localhost:5140/login) |
| **Verified Farmer** | Golden Harvest Organics | `seller2@kisanova.com` | `Seller@123456` | [`http://localhost:5140/login`](http://localhost:5140/login) |
| **Commercial Buyer**| Zainab Ali | `buyer1@kisanova.com` | `Buyer@123456` | [`http://localhost:5000/login`](http://localhost:5000/login) |
| **Commercial Buyer**| David Miller | `buyer2@kisanova.com` | `Buyer@123456` | [`http://localhost:5000/login`](http://localhost:5000/login) |

---

## 🧪 Automated Verification & Testing

Kisanova includes an automated verification suite testing security, rate-limiting, pure token reset, atomic inventory decrement, COD/Farm Pickup workflows, IDOR isolation, and Socket.IO authorization:

```bash
# Execute full verification test suite against live backend
node backend/test_v6.js
```

### Verification Coverage (41 / 41 Tests Passed)
- ✅ Fail-fast JWT secret check (production throws fatal error if secret is missing)
- ✅ Pure token-based password reset (32-byte hex token, SHA-256 hash storage, single-use check, replay attack rejection)
- ✅ Sliding-window rate limiting on `/login` and `/forgot-password` (HTTP 429 with `Retry-After`)
- ✅ Atomic conditional inventory decrement under concurrent checkouts (race condition protection)
- ✅ Farm Gate Self-Pickup checkout (0 PKR delivery fee, address optional, `FARM_PICKUP` recorded)
- ✅ Cash on Delivery checkout (requires delivery address, rejects if omitted, `COD` recorded)
- ✅ Strict IDOR authorization (cross-buyer and cross-seller access returns HTTP 403 Forbidden)
- ✅ Order state machine transitions (backward transitions rejected; terminal statuses immutable)
- ✅ Terminal state auto-payment settlement (`DELIVERED` and `PICKED_UP` mark sub-orders as `PAID`)
- ✅ Real seller metrics accounting (`grossOrderValue`, `cashCollected`, `pendingCodAmount`, `farmPickupAmount`; 0 fake refunds)
- ✅ Upload file filter (disallowed `.php` rejected; allowed `.png` accepted)
- ✅ Socket.IO JWT handshake authentication & conversation room authorization

```bash
# Verify production frontend bundling
cd frontend && npm run build
```
*(Builds 1,600+ modules with 0 compilation errors).*

---

## 🚢 Deployment Guide

### Deploying Frontend (Vercel / Netlify / Cloudflare Pages)
1. Point your Git repository to the deployment provider.
2. Set Root Directory to `frontend/`.
3. Set Build Command to `npm run build`.
4. Set Output Directory to `dist`.
5. Add Environment Variables:
   - `VITE_API_URL`: URL of your deployed backend (e.g. `https://api.yourdomain.com/api`).
   - `VITE_SOCKET_URL`: URL of your WebSocket server (e.g. `https://api.yourdomain.com`).

### Deploying Backend (Render / Railway / AWS / VPS)
1. Point your deployment service to `backend/`.
2. Start Command: `node src/server.js`.
3. Set environment variables from `backend/.env.example`.
4. Set `NODE_ENV=production` and ensure `JWT_SECRET` is set.

### Deploying Database (Managed MySQL / AWS RDS / DigitalOcean)
1. Import `database/schema.sql`.
2. Run database migrations (`database/migrate_v4.js`).
3. Seed baseline accounts and crop categories using `node database/seed.js`.

---

## 📄 License & Contact

Distributed under the **MIT License**. See `LICENSE` for more information.

- **GitHub Repository**: [https://github.com/hassaanrana07/KISANOVA-Agri-Marketplace.git](https://github.com/hassaanrana07/KISANOVA-Agri-Marketplace.git)
- **Author**: Hassaan Rana
