# Universal Checkout Protocol (UCP)

UCP is a Next.js 16 + Turborepo monorepo for a universal, URL-driven checkout experience. It provides shared Zod schemas, reusable UI primitives, and a reference checkout app that can be embedded or extended by integrations.

## North Star
Enable any commerce system to create a portable, secure checkout that works across platforms and channels.

## Highlights
- URL-first checkout state powered by nuqs
- Shared, typed Zod schemas for buyers, payments, and orders
- UI primitives packaged in @repo/ui
- App Router implementation with CSS modules

## Quick Start
Prerequisites: Bun and Node.js 20+.

```bash
bun install
bun run dev
```

App runs at http://localhost:3000.

## Scripts
- `bun run dev` - start Next.js in dev mode
- `bun run build` - build the app
- `bun run start` - run production server
- `bun run lint` - lint the repo
- `bun run test` - run all tests
- `bun run test:entities` - run entities tests only

## Vercel Deployment
- Vercel Git integration is recommended for preview and production deployments.
- CI adds optional preview and production deploy jobs when the following secrets are set:
	- `VERCEL_TOKEN`
	- `VERCEL_ORG_ID`
	- `VERCEL_PROJECT_ID`

## Vercel Analytics
Enable analytics and speed insights in production:
1. Install `@vercel/analytics` and `@vercel/speed-insights`.
2. Add the analytics components in `app/layout.tsx`.
3. Enable Vercel Analytics in the project dashboard.

## Repo Structure
- `app/` - Next.js App Router UI and routes
- `components/` - shared UI components
- `packages/entities/` - Zod schemas, parsers, types
- `packages/polar/` - Polar checkout + webhook integration helpers
- `packages/shopify/` - Shopify Storefront API clients and schemas
- `packages/ui/` - reusable UI components
- `docs/` - architecture and workflow docs

## Integrations
- Headless checkout endpoint: `POST /api/checkout`
- Shopify product endpoint: `GET /api/shopify/products?handle=...`
- Polar checkout endpoint: `POST /api/polar/checkout`
- Payment webhooks: `POST /api/webhooks/payment?provider=polar`

## i18n + Multi-Currency
- Internationalization is powered by `next-intl` with locale segments.
- Locale routing uses `/en-US/...` and `/es-ES/...` with `en-US` as default.
- Currency formatting uses `Intl.NumberFormat` with the active locale.

### Integration Environment Variables
- `SHOPIFY_STORE_DOMAIN` (example: `your-store.myshopify.com`)
- `SHOPIFY_STOREFRONT_TOKEN`
- `SHOPIFY_API_VERSION` (optional, default `2024-10`)
- `POLAR_API_KEY`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_BASE_URL` (optional)

## Architecture Notes
- URL-driven state is centralized in `packages/entities` parsers and consumed by the app.
- Form data flows through server actions for validation and confirmation.
- CSS modules keep styles co-located and predictable.

## Roadmap

See [docs/development-status.md](docs/development-status.md) for detailed status and timeline.

**Current Focus**: Pipeline Observability (Issues #5-6)

**Upcoming Features**:
- Visual Dashboard for pipeline monitoring (#7-10)
- npm package publishing (#11)
- `create-ucp` CLI tool (#12)

**Foundation Complete** ✅:
- URL-driven state with nuqs
- Zod validation schemas
- Multi-form checkout flow
- Template system
- i18n support (EN, ES)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- How to set up the development environment
- Code style guidelines and best practices
- How to pick up and work on issues
- Pull request process

All development is tracked via [GitHub Issues](https://github.com/BarreraSlzr/marketing-ucp/issues). Check the issue board to see what's being worked on or to propose new features.

**Quick guidelines**:
- Keep changes focused and well-documented
- Add tests for schema or behavior changes
- Follow DRY (Don't Repeat Yourself) and KISS (Keep It Simple) principles
- Prefer TypeScript type safety over any
- Use Zod schemas for runtime validation

## License
MIT. See [LICENSE](LICENSE).
