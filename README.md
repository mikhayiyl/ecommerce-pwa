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
| `DATABASE_URL` | A PostgreSQL connection URL from the selected database host. Keep its username and password private. | Database/Prisma milestone |
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

Only set up a PostgreSQL database and OAuth credentials when we reach those
milestones. Stripe, image-storage, and AI-provider keys will be documented when
we select and implement those integrations; none are required yet.

## Product images

The design image is only a visual guide. The current starter does not contain
product listings or product imagery. When we build the catalog, we will use
real product photos that we own, have permission to use, or obtain from a
licensed image source, and store/optimize them with the selected image service.
We will configure Next.js image domains for that service as part of the same
milestone rather than using emoji or invented images as product photos.

## Planned milestones

Features will be implemented, checked, and committed in focused milestones:

1. Project foundation and configuration.
2. Storefront shell and responsive navigation.
3. Product catalog, categories, and real product imagery.
4. Cart, customer accounts, and checkout.
5. Admin tools and inventory.
6. PWA/offline behavior and AI shopping features.

The order and scope can be adjusted as the project requirements are refined.
