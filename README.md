# GoldGram storefront

The customer-facing site, built from the three HTML prototypes in the project root. English (`/en`) and Arabic (`/ar`, right to left); `/` redirects to `/ar`.

Next.js 16 (App Router, TypeScript). Plain CSS ported from the prototypes, no UI framework.

## Run

```powershell
pnpm install
pnpm dev        # http://localhost:3100  (port 3000 is taken on this machine)
```

The backend must be running on `http://localhost:4000` for the shop, checkout, sign-in and account pages. The home page, help centre and legal pages render without it.

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server on 3100 |
| `pnpm build` / `pnpm start` | Production build and server on 3100 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Generates route types, then `tsc --noEmit` |
| `pnpm test` | Unit tests (validation, cart, formatting, dictionaries) |

Environment variables are listed in `.env.example`. None is required locally.

## How it is put together

- `src/app/[locale]/` — one folder per page. The layout sets `lang`, `dir` and the fonts.
- `src/app/styles/site.css` — the prototype's stylesheet, ported as is (fonts turned into variables, left/right into logical properties so the same rules serve Arabic). `help.css` is the help centre's. `app.css` holds the font rules, the Arabic adjustments and the few additions.
- `src/app/fonts.ts` — the font rule: English uses Lora for headings and numbers and Poppins for text; Arabic uses Almarai for headings, Cairo for text and Lora for every digit.
- `src/i18n/` — all copy, `en.ts` and `ar.ts`, type-checked to have the same keys.
- `src/content/` — the 55 help-centre questions in both languages.
- `src/lib/` — `server-api.ts` (Server Components call the backend directly), `client-api.ts` (the browser calls `/api/*`, which `next.config.ts` proxies to the backend), `cart.ts` (cart in `localStorage`, ids and quantities only), `validation.ts` (the same field rules as the backend), `format.ts`.
- `src/components/` — the screens' interactive parts.

Prices are never trusted from the browser: the cart holds product ids and quantities, the checkout asks the backend for a quote, and the order is priced again on the server.

The contract with the backend, the acceptance criteria and the edge cases are in `docs/SPEC.md` at the project root.
