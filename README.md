# Kisanova — Full-Stack Agricultural Marketplace

Kisanova is a commercial-grade, multi-seller agricultural marketplace designed to connect verified farmers directly with wholesale and retail buyers while eliminating exploitative intermediary commissions.

Built with a unified **Node.js/Express** REST API, a single **MySQL** database, and a modern **React** frontend structured into three clearly separated user experiences:
1. **Public Buyer Marketplace** (Commercial customer storefront with multi-seller cart & direct farm chat)
2. **Seller Portal (`/seller`)** (Farm crop inventory management, order dispatch, buyer inquiries)
3. **Admin Panel (`/admin`)** (Governance console for approving sellers, moderating crop listings, and verifying manual bank wire transfers)

---

## 1. Architecture & Security

```
                                  ┌────────────────────────┐
                                  │      React 18 SPA      │
                                  └───────────┬────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
         ┌──────────▼──────────┐   ┌──────────▼──────────┐   ┌──────────▼──────────┐
         │ Public Marketplace  │   │    Seller Panel     │   │     Admin Panel     │
         │ (/, /products, etc) │   │     (/seller/*)     │   │     (/admin/*)      │
         └──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              │ REST Calls + Bearer JWT
                                              ▼
                             ┌──────────────────────────────────┐
                             │    Node.js + Express Backend     │
                             │  • Strict RBAC (ADMIN/SELLER/BUY)│
                             │  • Pluggable Payment Service     │
                             │  • Multimedia Storage Service    │
                             └────────────────┬─────────────────┘
                                              │
                                              ▼
                             ┌──────────────────────────────────┐
                             │       MySQL Database (8.0)       │
                             │        (kisanova_db)             │
                             └──────────────────────────────────┘
```

### Role-Based Authorization
- **ADMIN**: Access to governance routes (`/api/admin/*`). Can approve/reject/suspend sellers, approve/reject crop listings, and verify manual bank payments.
- **SELLER**: Access to seller routes (`/api/seller/*`). Sellers can ONLY see orders containing their own farm's products and can only edit their own crop listings.
- **BUYER**: Access to buyer storefront, cart, multi-seller checkout, and order history (`/api/cart/*`, `/api/orders/*`).
- **Authorization Enforcement**: Every protected endpoint determines identity from cryptographically verified JWT Bearer tokens and live MySQL state. Role parameters submitted by the client are never trusted.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, React Router v6, Axios
- **Backend**: Node.js, Express, JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), Multer
- **Database**: MySQL 8.0, `mysql2` connection pooling with prepared statements & transactions
- **Payment Abstraction**: Pluggable provider architecture (`kisanova_sandbox`, `stripe`, `bank_transfer`)
- **Media Storage**: Cloudinary integration with seamless local static disk fallback (`/uploads/`)

---

## 3. Database Schema

The database `kisanova_db` consists of 12 normalized relational tables:
1. `users`: Core account identity with roles (`ADMIN`, `SELLER`, `BUYER`) and status (`ACTIVE`, `SUSPENDED`).
2. `sellers`: Farm profiles linked to user accounts (`approval_status`: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`).
3. `products`: Crop listings with botanical strains, packaging units, prices, and stock (`status`: `PENDING`, `APPROVED`, `REJECTED`, `INACTIVE`).
4. `product_images`: Multi-photo gallery linked to each crop.
5. `carts`: Buyer carts.
6. `cart_items`: Cross-seller cart items capturing snapshot prices and quantities.
7. `orders`: Parent order representing checkout delivery details, total amount, and payment status (`PAID`, `PENDING`, `FAILED`).
8. `seller_orders`: Independent sub-orders created per farm, with status progression (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`).
9. `order_items`: Line items allocated specifically to their respective seller sub-order.
10. `conversations`: Buyer-to-seller threads associated with specific crops and orders.
11. `messages`: Multimedia messages supporting `TEXT`, `IMAGE`, and `VIDEO` attachments.
12. `payments`: Payment transaction logs storing provider references, currency, amount, and bank transfer receipts.

---

## 4. Local Development Setup

### Prerequisites
- Node.js (v18 or v20+)
- MySQL Server (8.0+)

### Step 1: Clone & Configure Environment Variables
Copy `.env.example` in both root and `backend/`:
```bash
cp .env.example backend/.env
```

Ensure MySQL is running, then verify credentials in `backend/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=kisanova_db
DB_PORT=3306

JWT_SECRET=kisanova_ultra_secure_jwt_secret_key_2026_farmers_market
JWT_EXPIRES_IN=7d

PAYMENT_PROVIDER=kisanova_sandbox
PAYMENT_API_KEY=test_sk_kisanova_sandbox_key
PAYMENT_SECRET=test_whsec_kisanova_secret

# Optional Cloudinary (leaves local uploads active if empty)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Step 2: Initialize Database & Seed Demo Data
```bash
# Initialize schema in MySQL
mysql -u root < database/schema.sql

# Seed demo users, crops, multi-seller orders, and chat threads
npm run seed
```

### Step 3: Run Automated Test Suite
Verify all 18 integration tests passing (Auth, RBAC, Multi-seller Cart, Checkout, Sandbox Payments, Seller Orders, Admin Moderation, Chat):
```bash
npm test
```

### Step 4: Start Backend & Frontend
In Terminal 1 (Backend API on `http://localhost:5000`):
```bash
npm run start:backend
```

In Terminal 2 (Frontend React App on `http://localhost:5173`):
```bash
npm run start:frontend
```

---

## 5. Demo Accounts

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@kisanova.com` | `Admin@123456` | Marketplace Administrator |
| **Seller 1** | `seller1@kisanova.com` | `Seller@123456` | Green Valley Farms (Approved) |
| **Seller 2** | `seller2@kisanova.com` | `Seller@123456` | Golden Harvest Organics (Approved) |
| **Seller 3** | `seller3@kisanova.com` | `Seller@123456` | Sunrise Agro Commodities (**Pending Approval Demo**) |
| **Buyer 1** | `buyer1@kisanova.com` | `Buyer@123456` | Zainab Ali |
| **Buyer 2** | `buyer2@kisanova.com` | `Buyer@123456` | David Miller |

*Note: All login screens feature one-click demo autofill buttons for instant testing.*

---

## 6. End-to-End 3–5 Minute Demonstration Walkthrough

Follow these steps to demonstrate the complete workflow:

1. **Homepage Discovery**: Open `http://localhost:5173`. Browse the agricultural categories (Grains, Fruits, Organic Honey) and live crop search.
2. **Product Catalog**: Click "Browse Crops & Produce" (`/products`). Filter by category or search "Wheat".
3. **Product Inspection**: Open "Golden Amber Durum Wheat". Inspect the photo gallery, pricing per bag, and seller card for **Green Valley Farms**.
4. **Add to Cart**: Click "Add to Cart".
5. **Multi-Seller Cart**: Navigate back to products, open "Fresh Ratnagiri Alphonso Mangoes" (from **Golden Harvest Organics**), and add 2 crates to the cart.
6. **Inspect Multi-Seller Cart (`/cart`)**: Open cart. Observe items visually organized by independent seller (**Green Valley Farms** and **Golden Harvest Organics**) with individual farm subtotals and one combined grand total.
7. **Proceed to Checkout**: Click "Proceed to Checkout". If not signed in, log in as Buyer 1 (`buyer1@kisanova.com`). Notice you are immediately returned to your checkout flow without being redirected to an unwanted dashboard.
8. **Checkout & Payment**: Fill in delivery destination, choose **Online Card / Gateway**, and click "Proceed to Online Payment".
9. **Sandbox Gateway Settlement**: The interactive payment gateway verifies the cryptographic signature with the backend and transitions the order to **PAID**.
10. **Order Confirmation & My Orders (`/orders`)**: View your placed order breakdown, with independent sub-orders for each farmer.
11. **Log in as Seller 1 (`/seller/login`)**: Use `seller1@kisanova.com`.
12. **Seller Order Isolation**: Open `/seller/orders`. Observe that Seller 1 **only** sees their durum wheat line items and has zero access to Seller 2's mangoes.
13. **Order Status Progression**: Open the order detail and advance dispatch status from `CONFIRMED` → `PROCESSING` → `SHIPPED`.
14. **Crop Inventory Management**: Open `/seller/products`. Click "Add New Crop" (`/seller/products/new`). Create a crop lot with description and photo. Observe it enters `PENDING` review.
15. **Direct Farmer Chat**: Open `/seller/messages`. Open conversation with Zainab Ali. Reply with text and photo/video attachments.
16. **Log in as Admin (`/admin/login`)**: Use `admin@kisanova.com`.
17. **Farmer & Product Moderation**:
    - Go to `/admin/sellers`: Approve pending seller **Sunrise Agro Commodities**.
    - Go to `/admin/products`: Review and approve newly submitted crop listings.
    - Go to `/admin/orders`: Inspect cross-farm orders and review manual bank wire payment receipts.

---

## 7. Production Deployment Guide

### Frontend Deployment (e.g. Vercel, Netlify, Cloudflare Pages)
1. Set the root directory to `frontend/`.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set Environment Variable:
   - `VITE_API_URL`: URL of your deployed backend API (e.g., `https://api.kisanova.com/api`)

### Backend Deployment (e.g. Render, Railway, AWS ECS, Fly.io)
1. Set the root directory to `backend/`.
2. Start Command: `node src/server.js`
3. Configure Environment Variables in your hosting dashboard:
   - `PORT`: 5000 (or host-assigned port)
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: URL of your deployed frontend (e.g., `https://kisanova.com`)
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`: Credentials for your hosted MySQL database
   - `JWT_SECRET`: High-entropy 64-character secret
   - `PAYMENT_PROVIDER`: `kisanova_sandbox` or `stripe`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary credentials for cloud media storage

### Database Deployment (e.g. Aiven, PlanetScale, AWS RDS MySQL)
1. Connect via MySQL client and run:
   ```bash
   mysql -h your-db-host -u your-db-user -p your-db-name < database/schema.sql
   ```
2. Seed initial admin account and baseline categories using `npm run seed`.

---

## 8. License
Kisanova is open-source software licensed under the MIT License.
