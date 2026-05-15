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

## Run locally

```bash
npm install
npm run dev
```

The React app runs on `http://127.0.0.1:5173`.
The Express API runs on `http://localhost:5000`.

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
