# RetailHub - Multi-Tenant Retail E-Commerce SaaS Platform 

# Overview:

Full MERN stack SaaS platform that lets offline retail businesses register, get an
auto-generated Business ID and online store, manage products/orders/customers, and
sell online with UPI QR payments or Cash on Delivery.

---

## Run locally

### 1. Backend

```
npm run dev
http://localhost:5000
```




### 2. Frontend

```
npm run dev                # http://localhost:5173
```




Frontend (nginx) on port 80, backend on port 5000.

---

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


## Tech stack

React 18 + Redux Toolkit + Tailwind CSS + HeroUI + Axios + React Router ·
Node.js + Express + MongoDB Atlas· JWT + refresh tokens + bcrypt + Docker
