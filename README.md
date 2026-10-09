# Ecommerce PWA

A Next.js and TypeScript e-commerce PWA, developed feature by feature. This
repository is the new project; `issue-tracker-main` is a separate reference for
Next.js implementation patterns. The image at `../design.jpeg` is a visual
reference for the storefront, not a functional specification.

## Current status

The project currently contains the Next.js foundation only. The database,
authentication, product catalog, checkout, PWA behavior, and AI features will
be added and tested in separate milestones. Their credentials are not needed
to run the current starter page.

## Requirements

- Node.js (LTS recommended)
- npm

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values described below. The
   `.env` file is local and must never be committed.

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

Useful project checks:

```bash
npm run lint
npm run build
```

## Environment variables

The `.env.example` file lists the planned database and authentication settings.
They are placeholders at this stage; no database or authentication code is
configured yet.

| Variable | What to provide | When needed |
| --- | --- | --- |
| `DATABASE_URL` | The pooled Neon PostgreSQL URL. Filled automatically by `neon link` / `neon deploy`; never commit it. | Database/Prisma milestone |
| `DATABASE_URL_UNPOOLED` | The direct (non-pooled) Neon URL, useful for Prisma migrations. Also filled automatically. | Database/Prisma milestone |
| `NEON_BRANCH` | The linked Neon branch (`production`). Filled automatically. | Neon CLI |
| `NEXTAUTH_URL` | The app's base URL. Use `http://localhost:3000` locally and the deployed HTTPS URL in production. | Authentication milestone |
| `NEXTAUTH_SECRET` | A strong, private random secret. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. | Authentication milestone |
| `GOOGLE_CLIENT_ID` | The OAuth client ID for a Google OAuth web application. | Google sign-in milestone |
| `GOOGLE_CLIENT_SECRET` | The matching OAuth client secret. Do not share or commit it. | Google sign-in milestone |

For Google sign-in, configure the OAuth consent screen and a web application
client in Google Cloud Console. Add `http://localhost:3000` as an authorized
JavaScript origin and `http://localhost:3000/api/auth/callback/google` as an
authorized redirect URI. Add the corresponding production origin and callback
when deploying. Keep all credentials in `.env` locally and in the hosting
provider's encrypted environment-variable settings in production.

## Neon database

The project uses [Neon](https://neon.tech) PostgreSQL, linked to project
`aged-block-08134795` on the `production` branch. To set it up on a new machine:

```bash
npm i -g neon@latest
neon login
neon link --project-id aged-block-08134795 --branch production -y
neon deploy
```

`neon link` and `neon deploy` write `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and
`NEON_BRANCH` into `.env`. The Neon policy lives in `neon.ts`; `.neon/` is local
link state and is git-ignored. Prisma and the schema are not set up yet.

Only set up OAuth credentials when we reach the authentication milestone. Stripe, image-storage, and AI-provider keys will be documented when
we select and implement those integrations; none are required yet.

## Product images

The design image is only a visual guide. The current starter does not contain
product listings or product imagery. When we build the catalog, we will use
real product photos that we own, have permission to use, or obtain from a
licensed image source, and store/optimize them with the selected image service.
We will configure Next.js image domains for that service as part of the same
milestone rather than using emoji or invented images as product photos.

## Authentication

Auth.js (NextAuth v5) with email/password (bcrypt) and optional Google sign-in.
`NEXTAUTH_URL` and `NEXTAUTH_SECRET` are required; Google sign-in is only shown
when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set (create an OAuth
web client in Google Cloud Console with the redirect URI
`<NEXTAUTH_URL>/api/auth/callback/google`).

Admin access is enforced on the server (`requireAdmin()` in `src/lib/security/guards.ts`).
To make an account an admin, register it first and then run:

```bash
npm run make-admin -- you@example.com
```

## AI features

Natural-language search (`/api/ai/search`), recommendations (`/api/ai/recommendations`) and the chat assistant (`/api/ai/chat`) work out of the box with rule-based logic. Set `GEMINI_API_KEY` (free key from https://aistudio.google.com/apikey) in `.env` to enable AI-written answers. Prices, stock and ratings always come from the database and are passed to the model as facts; the model is instructed never to invent them.

## Planned milestones

Features are implemented, checked, and committed in focused milestones:

1. Project foundation, Prisma + Neon (done).
2. Storefront shell and homepage (done).
3. Product catalog, categories, search and real product imagery (done).
4. Guest cart with server-side validation (done).
5. Authentication and role-based access (done). Email verification and
   password reset will be added once an email provider is chosen.
6. Checkout, Stripe and orders.
7. Reviews, wishlist and discounts.
8. Admin tools and inventory.
9. PWA/offline behavior and AI shopping features.
10. SEO, e2e tests and deployment.

The order and scope can be adjusted as the project requirements are refined.
