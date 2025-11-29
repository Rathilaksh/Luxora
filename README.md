# Luxora — Starter

A minimal, local-first Luxora starter app. It uses a static frontend and a small Express server that serves sample listings from `data/listings.json`.

## What you get

- `public/` — frontend (HTML, CSS, JS)
- `data/listings.json` — sample listing data
- `server.js` — Express server serving `public/` and `/api/listings`
- `package.json` — start/dev scripts

## Quick start (macOS / zsh)

1. Install dependencies:

```bash
cd /Users/lakshrathi/Desktop/Airbnb_clone
npm install
```

2. Run the app:

```bash
npm start
```

3. Open http://localhost:3000 in your browser.

## Next steps (suggested)

- Add user authentication (NextAuth / Auth0 / Firebase)
- Replace JSON with a database (Postgres + Prisma) for persistent listings and bookings
- Add booking flow, calendar availability, and payments (Stripe)
- Improve UI with React/Next.js + Tailwind CSS
- Add tests and CI, then deploy (Vercel / Netlify / Heroku)

If you'd like, I can convert this starter into a Next.js app with Prisma and authentication next — tell me which features you want first and I’ll implement them.
