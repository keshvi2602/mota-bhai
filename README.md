# Mota Bhai Ecommerce

An ultra-premium ecommerce storefront built with React, Tailwind CSS, Framer Motion, Node.js, and Express.

## Frontend architecture

```text
client/
  src/
    App.jsx
    main.jsx
    styles.css
    components/
      CartDrawer.jsx
      Header.jsx
      ProductCard.jsx
    data/
      products.js
    utils/
      whatsapp.js
```

## Backend integration outline

- `GET /api/products` feeds the React catalog.
- `POST /api/admin/login` authenticates the single admin with bcrypt + JWT.
- `POST /api/admin/products` creates protected products with `tags`.
- `POST /api/admin/collections` creates collections that match products by tag.
- `GET /api/collections/:handle/products` serves products whose `tags[]` contain the collection `matchTag`.
- `GET /api/theme` serves the live theme config for the React storefront.
- `PUT /api/admin/theme` saves theme variables behind JWT auth.
- `POST /api/orders` can receive cart/customer payloads when you add database checkout.
- Current WhatsApp checkout formats cart state directly in the frontend and opens the `wa.me` API.
- Replace the in-memory `orders` array with MongoDB/PostgreSQL when you need persistence.

## Database schemas

- `User`: admin email, bcrypt password hash, role.
- `Product`: name, image, price, discount, category, `tags[]`, active status.
- `Collection`: title, handle, `matchTag`; products route automatically by tag.
- `Theme`: `themeConfig` with primary color, button color, background color, surface color, and logo URL.

Copy `.env.example` to `.env` and set a strong `JWT_SECRET` before production use.

## MongoDB Atlas

Set `MONGO_URI` or `MONGODB_URI` to your Atlas connection string. The current template keeps the app database as `mota-bhai`:

```env
MONGO_URI=mongodb+srv://infokevallathiya_db_user:<db_password>@cluster0.fiatja9.mongodb.net/mota-bhai?retryWrites=true&w=majority&appName=Cluster0
```

Replace `<db_password>` with the real Atlas database-user password. If the password contains special characters such as `@`, `#`, `/`, or `:`, URL-encode those characters first.

If Node reports `querySrv ECONNREFUSED`, keep `MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8` in your env file. This makes Node resolve Atlas SRV records through public DNS instead of a local resolver that may reject SRV lookups.

## Run locally

```bash
npm install
npm run dev
```

The React app runs on `http://127.0.0.1:5173`.
The Express API runs on `http://localhost:5000`.

## Deploy

This project is deploy-ready as one Node app:

```text
mota-bhai-ecommerce/
  client/   React + Vite storefront
  server/   Express API + MongoDB
```

Use these settings on Render, Railway, Cyclic, or a Node hosting service:

```bash
Build command: npm install && npm run build
Start command: npm start
```

The build command creates `client/dist`. The Express server serves that folder in production and keeps all backend routes under `/api`.

Set these environment variables on your hosting dashboard:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8
JWT_SECRET=your_long_random_secret
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password
CLIENT_URL=https://your-live-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_sender_email@gmail.com
SMTP_PASS=your_email_app_password
SMTP_FROM="Mota Bhai <your_sender_email@gmail.com>"
OTP_EXPIRY_MINUTES=10
OTP_FROM_NAME=Mota Bhai
OTP_FROM_EMAIL=your_sender_email@gmail.com
```

Do not set `VITE_API_URL` in production unless the API is deployed on a separate domain. Leaving it blank makes the frontend call the same deployed domain, for example `/api/products`.

Local development also uses same-origin `/api`; Vite proxies those requests to `http://localhost:5000`.

## Features

- Obsidian, gold, and emerald premium visual system
- Glassmorphism header and sub-navigation
- Framer Motion 3D hover product cards
- Fly-to-cart add animation
- Product catalog powered by Express API
- Slide-out cart drawer
- Quantity controls
- WhatsApp checkout with formatted order text
- In-memory order API
