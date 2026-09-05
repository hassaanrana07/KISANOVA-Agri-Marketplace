# 🌾 KISANOVA — Agricultural Marketplace (کسان نووا زرعی منڈی)

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/GIS-Leaflet%20%2B%20Satellite-199900.svg)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Kisanova (کسان نووا)** is a production-grade, multi-seller agricultural marketplace engineered specifically for the Pakistani agricultural ecosystem. It connects verified farmers directly with commercial bulk buyers, food processors, and retail customers—eliminating exploitative middlemen commissions while providing transparent Cash on Delivery (COD) accounting, authentic bilingual Urdu RTL support, and high-resolution satellite farm GIS mapping.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Core Features & Functions](#-core-features--functions)
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
  │ • COD Checkout      │                     │ • COD Ledger        │                     │ • 4 SVG Charts      │
  └──────────┬──────────┘                     └──────────┬──────────┘                     └──────────┬──────────┘
             │                                           │                                           │
             └───────────────────────────────────────────┼───────────────────────────────────────────┘
                                                         │ REST + Bearer JWT + WebSocket
                                                         ▼
                                      ┌──────────────────────────────────────┐
                                      │      Unified Backend (Port 8000)     │
                                      │  • Express REST API                  │
                                      │  • Socket.IO Real-Time Engine        │
                                      │  • Brevo v3 Transactional Email      │
                                      │  • Strict COD Order Governance       │
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
- **Commercial Public Marketplace (`:5000`)**: Designed for buyers to discover farm produce, browse categories (Grains, Fruits, Vegetables, Cotton, Dairy), communicate directly with farmers, and place multi-seller COD orders.
- **Seller Backend Portal (`:5140`)**: Dedicated operational interface for farmers with farm profile customization, crop listing management, order dispatch pipeline, and financial settlement accounting.
- **Admin Governance Console (`:5174`)**: High-contrast administrative cockpit with real SVG visual analytics, seller verification audits, user management, and order governance.

### 2. Bilingual Seller Portal (English + Authentic Pakistani Urdu RTL)
- **Authentic Agricultural Vocabulary**: Comprehensive Urdu dictionary covering agricultural units (`من` / maund, `کلو` / kg, `بوری` / bag), COD accounting (`واجب الادا` / outstanding balance, `وصول شدہ` / collected), order stages, and farm details.
- **Dynamic RTL Layout**: Toggling Urdu updates `document.documentElement.dir = 'rtl'` and `lang = 'ur'`, mirroring the entire interface (right-sliding mobile drawer, mirrored chevrons, forms, and tables).
- **Persistent Selection**: Stores language choice in `localStorage` across page reloads.

### 3. Production Agricultural GIS Farm Map
- **Dual Map Layers**: Instant toggle between standard OpenStreetMap vector roads and high-resolution **Esri World Imagery Satellite** tiles (`ArcGIS/rest/services/World_Imagery/MapServer`) for inspecting fields and waterways.
- **True Fullscreen Mode**: Expands map to `100vw × 100vh` with Leaflet `map.invalidateSize()` reflow, preserving all polygon vertices and markers.
- **Debounced Location Search**: OpenStreetMap Nominatim geocoding restricted to Pakistan (`countrycodes=pk`) with live autocomplete suggestions.
- **Nearby Wholesale Mandis Discovery**: Farmers can discover proximity to Pakistan's major agricultural wholesale grain mandis (Lahore, Multan, Faisalabad, Sahiwal, Sargodha, Rahim Yar Khan, Hyderabad, Sukkur, Peshawar, Quetta) using Haversine geodesic distance calculation.
- **Polygon Acreage Calculation**: Spherical excess algorithm calculates exact farm acreage from polygon boundary coordinates and displays it alongside seller-declared acreage.

### 4. Strict Cash on Delivery (COD) Only Model
- **Zero Online Payment Gateways**: Credit card mocks, sandbox gateways, and third-party payment integrations are completely disabled.
- **COD Accounting Ledger**: Prominently displayed on seller order details:
  - **Total Order Value** (`amount_due`)
  - **Cash Collected** (`amount_paid`)
  - **Outstanding Balance** (`amount_remaining`)
- **Partial Payment Tracking**: Enables recording advance cash or partial cash collected at delivery, updating statuses to `PARTIALLY_PAID` or `PAID`.

### 5. Brevo Email OTP & Cryptographic Token Security
- **Brevo REST API (`api.brevo.com/v3/smtp/email`)**: Dispatches transactional email verification codes with branded agricultural green HTML template and development console fallback.
- **Anti-User Enumeration**: Password reset requests return an identical generic confirmation message regardless of whether an account exists, eliminating account discovery attacks.
- **60-Second Cooldown**: Rate limits repeated OTP requests to prevent abuse.
- **Cryptographically Secure Reset Tokens**: Validating an OTP returns a 32-byte hex authorization token (`crypto.randomBytes(32)`). Its SHA-256 hash is stored in MySQL with a 15-minute expiration window.
- **Single-Use Enforcement**: Tokens are invalidated immediately upon password reset (`used = TRUE`), rejecting replay attacks.

### 6. Real-Time Chat & Multimedia Messaging
- Bidirectional messaging powered by **Socket.IO** between buyers and farmers.
- Supports text, image, and video attachments with local disk fallback or Cloudinary storage.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18 (Single Page Application via Vite 5) |
| **Styling & UI** | Tailwind CSS 3, Lucide React Icons |
| **GIS & Mapping** | Leaflet 1.9, React-Leaflet, Esri World Imagery, OpenStreetMap Nominatim |
| **State & Networking** | React Context API, Axios, Socket.IO Client |
| **Backend Framework** | Node.js (v18+ / v20+ / v24+), Express.js 4 |
| **Real-Time Communication**| Socket.IO Server |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, Node `crypto` |
| **Transactional Email** | Brevo v3 SMTP REST API (`https://api.brevo.com/v3/smtp/email`) |
| **Database** | MySQL 8.0 with `mysql2` connection pooling & prepared statements |
| **File Storage** | Multer local storage (`/uploads/`) with Cloudinary cloud storage fallback |

---

## 📁 Project Folder Structure

```
KISANOVA/
├── backend/                             # Express REST API & Socket.IO Server
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                    # MySQL2 pool configuration
│   │   ├── controllers/
│   │   │   ├── adminController.js       # Admin KPIs, audits, moderation
│   │   │   ├── authController.js        # Auth, Brevo OTP, reset tokens
│   │   │   ├── cartController.js        # Multi-seller cart operations
│   │   │   ├── chatController.js        # Messaging & conversations
│   │   │   ├── notificationController.js# In-app notifications
│   │   │   ├── orderController.js       # COD order creation & tracking
│   │   │   ├── paymentController.js     # COD settlement & ledger
│   │   │   ├── productController.js     # Crop catalog & inventory
│   │   │   └── sellerController.js      # Farm profiles, polygon GIS
│   │   ├── middleware/
│   │   │   └── auth.js                  # JWT validation & RBAC (ADMIN/SELLER/BUYER)
│   │   ├── routes/
│   │   │   ├── adminRoutes.js           # /api/admin/*
│   │   │   ├── authRoutes.js            # /api/auth/*
│   │   │   ├── notificationRoutes.js    # /api/notifications/*
│   │   │   ├── paymentRoutes.js         # /api/payments/*
│   │   │   └── sellerRoutes.js          # /api/seller/*
│   │   ├── services/
│   │   │   ├── otpService.js            # Brevo v3 email & SMS OTP dispatch
│   │   │   ├── paymentService.js        # Strict COD payment processing
│   │   │   └── socketService.js         # Socket.IO room & event management
│   │   ├── app.js                       # Express app configuration & CORS
│   │   └── server.js                    # HTTP & Socket.IO server startup (Port 8000)
│   ├── uploads/                         # Local media uploads directory
│   ├── .env.example                     # Backend environment template
│   ├── package.json
│   ├── test_api.js                      # Baseline API integration tests
│   └── test_v5.js                      # 27-point end-to-end verification suite
│
├── frontend/                            # React 18 SPA (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── FarmLocationMap.jsx   # Public farm map viewer with satellite toggle
│   │   │   │   └── FarmLocationPicker.jsx# Interactive GIS editor (Satellite, Mandis, Area)
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
│   │   │   ├── admin/                   # Admin pages (Dashboard, Sellers, Products, Orders, Users)
│   │   │   ├── public/                  # Public pages (Home, Products, Detail, Cart, Checkout, Chat)
│   │   │   └── seller/                  # Seller pages (Dashboard, Inventory, Orders, Detail, Profile)
│   │   ├── services/
│   │   │   ├── api.js                   # Axios client with JWT interceptor
│   │   │   └── socket.js                # Socket.IO client instance
│   │   ├── utils/
│   │   │   ├── currency.js              # Pakistani Rupee (PKR) formatting
│   │   │   └── gis.js                   # Haversine distance & polygon area calculations
│   │   ├── App.jsx                      # Port-aware routing & route protection
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
│   └── migrate_v3.js                    # Reset token & polygon acreage migration
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🗄️ Database Schema & Migrations

The database `kisanova_db` consists of normalized relational tables:

- **`users`**: Account identity with role (`ADMIN`, `SELLER`, `BUYER`) and status (`ACTIVE`, `SUSPENDED`).
- **`sellers`**: Farm profiles linked to users, containing farm location hierarchy (`province`, `district`, `tehsil`, `village`), coordinates (`latitude`, `longitude`), `farm_polygon` coordinates, `seller_declared_area_acres`, `calculated_polygon_area_acres`, delivery terms, and payout info.
- **`products`**: Crop listings with botanical categories, pricing per unit, stock quantity, and moderation status (`PENDING`, `APPROVED`, `REJECTED`).
- **`product_images`**: Multi-photo gallery linked to products.
- **`carts` & `cart_items`**: Buyer carts supporting cross-farm multi-seller shopping.
- **`orders`**: Parent order recording delivery destination, total PKR amount, order status, and payment method (`COD`).
- **`seller_orders`**: Independent sub-orders generated per farm for granular dispatch and COD accounting (`amount_due`, `amount_paid`, `amount_remaining`).
- **`order_items`**: Line items allocated to respective seller sub-orders.
- **`conversations` & `messages`**: Real-time buyer-seller chat threads with multimedia attachments.
- **`password_resets`**: Stores OTP bcrypt hash, `reset_token_hash` (SHA-256), expiration timestamps (`expires_at`, `token_expires_at`), attempt count, and single-use `used` flag.
- **`seller_profile_audits`**: Historical audit log of farm profile updates and administrative reviews.

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
*(Optionally, also copy `frontend/.env.example` to `frontend/.env` if you wish to override default client ports).*

### Step 3: Initialize Database & Run Migrations
Ensure your MySQL service is running, then execute the schema and seed scripts:
```bash
# Initialize database schema
mysql -u root -p < database/schema.sql

# Seed demo users, verified farms, crops, orders, and chat threads
npm run seed
```

### Step 4: Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm run install:all
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

# Security
JWT_SECRET=kisanova_super_secret_jwt_key_2026_pakistan
JWT_EXPIRES_IN=7d

# Transactional Email (Brevo REST API)
# Leave empty to log OTP codes to server console during development
BREVO_API_KEY=
MAIL_FROM_EMAIL=noreply@kisanova.pk
MAIL_FROM_NAME=Kisanova Support

# SMS Gateway (Optional)
SMS_PROVIDER_API_KEY=
SMS_PROVIDER_API_SECRET=
SMS_SENDER_ID=KISANOVA

# Strict Cash on Delivery
PAYMENT_PROVIDER=cod_only

# Media Storage (Optional Cloudinary fallback)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 🌐 Dedicated Application Ports & Entry Points

To run all applications concurrently in development:

| Command | Portal | Port | URL | Description |
| :--- | :--- | :--- | :--- | :--- |
| `npm run start:backend` | **Backend API & Socket.IO** | `8000` | [`http://localhost:8000/api`](http://localhost:8000/api) | Express REST API & WebSockets |
| `npm run dev:public` | **Public Marketplace** | `5000` | [`http://localhost:5000`](http://localhost:5000) | Commercial buyer storefront |
| `npm run dev:seller` | **Seller Portal** | `5140` | [`http://localhost:5140`](http://localhost:5140) | English/Urdu RTL seller dashboard |
| `npm run dev:admin` | **Admin Console** | `5174` | [`http://localhost:5174`](http://localhost:5174) | Admin governance & audits |

> **Convenience Script**: You can run `npm run dev` from the root directory to launch the frontend on default Vite port `5173`.

---

## 🔑 Seed Test Credentials

The database seeder (`database/seed.js`) provisions ready-to-use demo accounts for immediate testing:

| Role | Name | Email | Password | Recommended Entry Point |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Marketplace Admin | `admin@kisanova.com` | `Admin@123456` | [`http://localhost:5174/login`](http://localhost:5174/login) |
| **Verified Farmer** | Green Valley Farms | `seller1@kisanova.com` | `Seller@123456` | [`http://localhost:5140/login`](http://localhost:5140/login) |
| **Verified Farmer** | Golden Harvest Organics | `seller2@kisanova.com` | `Seller@123456` | [`http://localhost:5140/login`](http://localhost:5140/login) |
| **Commercial Buyer**| Zainab Ali | `buyer1@kisanova.com` | `Buyer@123456` | [`http://localhost:5000/login`](http://localhost:5000/login) |

---

## 🧪 Automated Verification & Testing

Kisanova includes an automated end-to-end verification suite testing security, rate-limiting, OTP dispatch, token hashing, and COD workflows:

```bash
# Execute full verification test suite against live backend
node backend/test_v5.js
```

### Verification Coverage (27 / 27 Tests Passed)
- ✅ Anti-user enumeration verification on password reset (uniform HTTP 200)
- ✅ 60-second rate-limiting enforcement on OTP requests (HTTP 429)
- ✅ Database storage of bcrypt-hashed OTP with 10-minute expiration
- ✅ OTP verification generating cryptographically secure 32-byte hex `resetToken`
- ✅ Storage and validation of SHA-256 hash in MySQL (`token_expires_at`)
- ✅ Execution of password reset using `resetToken`
- ✅ Invalidation of used tokens (`used = 1`) and replay attack prevention (HTTP 400)
- ✅ Login issuance with updated password credentials
- ✅ Farm polygon coordinate retrieval and geodesic acreage calculations
- ✅ Multi-seller Cash on Delivery (COD) order attributes and status progression

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
5. Add Environment Variable:
   - `VITE_API_URL`: URL of your deployed backend (e.g. `https://api.yourdomain.com/api`).
   - `VITE_SOCKET_URL`: URL of your WebSocket server (e.g. `https://api.yourdomain.com`).

### Deploying Backend (Render / Railway / AWS / VPS)
1. Point your deployment service to `backend/`.
2. Start Command: `node src/server.js`.
3. Set environment variables from `backend/.env.example`.
4. Set `NODE_ENV=production`.

### Deploying Database (Managed MySQL / AWS RDS / DigitalOcean)
1. Import `database/schema.sql`.
2. Run database migrations (`database/migrate_v2.js`, `database/migrate_v3.js`).
3. Seed baseline administrative accounts and crop categories using `node database/seed.js`.

---

## 📄 License & Contact

Distributed under the **MIT License**. See `LICENSE` for more information.

- **GitHub Repository**: [https://github.com/hassaanrana07/KISANOVA-Agri-Marketplace.git](https://github.com/hassaanrana07/KISANOVA-Agri-Marketplace.git)
- **Author**: Hassaan Rana
