# Aplomb — landing site

One-page marketing site (React + Vite). Deploys free to Cloudflare Pages.

## Develop / build
```bash
cd web
npm install
npm run dev       # local preview at http://localhost:5173
npm run build     # → web/dist
```

## Deploy to Cloudflare Pages (free, *.pages.dev)
```bash
cd web
npm run build
npx wrangler login                         # one-time, opens browser
npx wrangler pages deploy dist --project-name aplomb
```
Wrangler prints the live URL, e.g. `https://aplomb.pages.dev`.
Paste that URL into Lemon Squeezy's "Your website" verification field.

## Edit before launch
In `src/App.tsx` (top constants):
- `DOWNLOAD_URL` → the installer download (GitHub Release or direct link).
- `PRO_CHECKOUT_URL` → the Lemon Squeezy checkout link.
- `PRO_PRICE` → your monthly price.
- `CONTACT_EMAIL` → your support email.

Custom domain (optional, later): Cloudflare Pages → project → Custom domains.
