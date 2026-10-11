# RetailHub - Multi-Tenant Retail E-Commerce SaaS Platform (V4 - Enterprise)

Full MERN stack SaaS platform that lets offline retail businesses register, get an
auto-generated Business ID and online store, manage products/orders/customers, and
sell online with UPI QR payments or Cash on Delivery.

## Run locally

### 1. Backend

```
cd backend
cp .env.example .env     # fill in MONGO_URI (MongoDB Atlas) and the JWT secrets
npm install
npm run dev               # nodemon, http://localhost:5000
```

On every startup the backend automatically reconciles MongoDB indexes
(`config/db.js` -> `Customer.syncIndexes()` etc.) — see "Bug fixes in this build"
below for why that matters.

### 2. Frontend

```
cd frontend
npm install
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:5000`, so
just open http://localhost:5173.

### 3. Docker (optional, Version 4 enterprise deployment)

```
cp backend/.env.example backend/.env    # fill in real values
docker compose up --build
```

Frontend (nginx) on port 80, backend on port 5000.

## How the app fits together (single backend + database)

1. An owner registers their business at `/register` -> gets a unique Business ID
   (`BUS-000001`) and an auto-generated store link (`/store/<slug>`).
2. The owner shares that store link (visible + copyable on the dashboard navbar).
3. A customer opens the store link, registers/logs in **for that store**, browses
   products, adds to cart/wishlist, and checks out with UPI QR or Cash on Delivery.
4. Placing an order notifies the owner in-app (bell icon, polled every 30s) and
   shows up immediately in Orders / Dashboard / Analytics - everything lives in
   the same MongoDB database, scoped per business via `business` fields on every
   document and enforced server-side from the JWT, never from client input.

## Bug fixes in this build

- **"Path `owner` is required" on business registration** - fixed by creating the
  `User` first, then the `Business` with the real `owner` id (see
  `backend/controllers/authController.js`).
- **Customer registration "already registered" for every email** - the real cause
  was a stale legacy index on the `customers` collection from earlier schema
  iterations. `backend/config/db.js` now calls `syncIndexes()` on `Customer` (and
  other models) on every startup, which drops any index no longer in the schema
  and creates the correct `{business, email}` compound unique index
  automatically - no manual Atlas/Compass cleanup needed. Email is also
  trim+lowercased both client and server side as defense-in-depth.
- **Missing UPI QR upload UI** - `frontend/src/pages/BusinessProfile.jsx` now has
  a full "Payment Settings" card with 4 QR uploads + UPI ID, wired to the backend
  endpoints that already existed.
- **No visible store link on the dashboard** - `StoreLinkBar` in the dashboard
  navbar shows the store URL with copy + open-in-new-tab buttons.
- **No "Order Now" button for customers** - every product card and the product
  detail page now has both "Add to Cart" and "Order Now" (adds to cart, jumps
  straight to checkout).
- **Confusing "No refresh token provided" error on login** - both axios
  interceptors (`frontend/src/api/axios.js` and `customerAxios.js`) now exclude
  `/auth/login`, `/auth/register`, `/auth/google` from the token-refresh-retry
  branch, so a wrong password shows "Invalid email or password" instead of a
  refresh-token error.

## Tech stack

React 18 + Redux Toolkit + Tailwind CSS + HeroUI + Axios + React Router ·
Node.js + Express + MongoDB Atlas + Mongoose · JWT + refresh tokens + bcrypt +
Google OAuth2 · Docker + AWS-ready.
