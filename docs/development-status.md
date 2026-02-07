# Development Status & Roadmap

This document provides an overview of UCP's current state, active development areas, and upcoming features.

## 🎯 Project Status: Active Development

UCP is under active development with a focus on transparency and incremental delivery. The core checkout functionality is production-ready, and we're building out observability and tooling features.

## ✅ Completed Features

### Foundation (v0.1.0)
- **URL-Driven State Management**: Full implementation with `nuqs` for stateless checkout
- **Zod Validation Schemas**: Complete type-safe validation for all entities (Buyer, Address, Payment, Product, Checkout)
- **Composable UI Components**: Reusable form components with CSS modules
- **Multi-Form Architecture**: Independent sections (buyer, address, payment) with coordinated submission
- **Internationalization**: English and Spanish translations with `next-intl`
- **Template System**: Pre-built checkout templates for quick demonstrations
- **Shopify Integration**: Product fetching via Storefront API
- **Polar Integration**: Payment session creation and webhook handling
- **Server Actions**: Type-safe form submission with progressive enhancement

## 🔨 In Development

### Pipeline Observability (Issues #5-6)
**Status**: In Progress  
**Priority**: P0 (Critical)

Creating the runtime backbone for UCP:
- Event logging system for all pipeline steps
- Checksum verification for tamper-proof receipts
- TracedStep wrapper for automatic instrumentation
- Support for both in-memory and persistent storage

**Related Files**:
- `packages/pipeline/` (to be created)
- `app/actions.ts` (to be instrumented)

**Tracking**: See [Issue #5](https://github.com/BarreraSlzr/marketing-ucp/issues/5) and [Issue #6](https://github.com/BarreraSlzr/marketing-ucp/issues/6)

## 📅 Planned Features

### Visual Dashboard (Issues #7-10)
**Status**: Planned  
**Priority**: P1 (High)

Observable UI for monitoring UCP pipelines:
- `/dashboard` route with pipeline overview
- Real-time event stream viewer
- Per-pipeline timeline visualization
- Handler health monitoring (Polar, Shopify, etc.)
- Checksum verification interface
- Receipt generation and sharing

**Tracking**: 
- [Issue #7](https://github.com/BarreraSlzr/marketing-ucp/issues/7) - Dashboard route and timeline
- [Issue #8](https://github.com/BarreraSlzr/marketing-ucp/issues/8) - Webhook API implementation
- [Issue #9](https://github.com/BarreraSlzr/marketing-ucp/issues/9) - Checksum verification
- [Issue #10](https://github.com/BarreraSlzr/marketing-ucp/issues/10) - Handler health monitoring

### npm Publishing (Issue #11)
**Status**: Planned  
**Priority**: P3 (Medium)

Making UCP packages installable:
- Rename packages to `@ucp/*` scope
- Add build step for CJS + ESM + types
- Set up changesets for versioning
- Publish to npm registry
- Add package READMEs

**Target Packages**:
- `@ucp/entities` - Schemas, parsers, types
- `@ucp/pipeline` - Event logging and checksums
- `@ucp/handler-polar` - Polar integration
- `@ucp/handler-shopify` - Shopify integration

**Tracking**: [Issue #11](https://github.com/BarreraSlzr/marketing-ucp/issues/11)

### Developer Tooling (Issue #12)
**Status**: Planned  
**Priority**: P3 (Medium)

Bootstrap new UCP projects instantly:
- `create-ucp` CLI tool
- Interactive project setup
- Handler selection (Polar, Shopify, etc.)
- Template selection
- Generated `.env.example`
- Quick-start documentation

**Tracking**: [Issue #12](https://github.com/BarreraSlzr/marketing-ucp/issues/12)

## 🏗️ Architecture Decisions

### Design Principles

1. **URL-First State**: Every piece of checkout state must be serializable to URL params
2. **Zero Server State**: No sessions, no cookies, no database for checkout state
3. **Type Safety**: Zod schemas validate at runtime; TypeScript types inferred from schemas
4. **Progressive Enhancement**: Forms work without JavaScript; enhanced with client-side updates
5. **Service Delegation**: UCP coordinates; external services (Polar, Shopify) handle payments/fulfillment
6. **Monorepo Structure**: Packages are independently usable but developed together

### Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5.7 (strict mode)
- **Validation**: Zod for runtime schema validation
- **State**: nuqs for URL-driven state management
- **Styling**: CSS Modules + Tailwind v4
- **UI**: Radix UI primitives
- **i18n**: next-intl
- **Build**: Turbopack (dev), Webpack (prod)
- **Monorepo**: pnpm workspaces

## 📊 Metrics & Goals

### Current Metrics
- **0** Server-side sessions (by design)
- **6** Core entity schemas (Buyer, Address, Payment, Product, Checkout, Template)
- **100%** URL-serializable state
- **2** Languages supported (EN, ES)
- **4** Pre-built templates
- **2** Payment handlers (Polar, Shopify)

### Goals for v0.2.0
- [ ] Complete pipeline observability package
- [ ] Launch dashboard with event viewer
- [ ] Add webhook processing route
- [ ] Document all APIs
- [ ] Add integration tests for full checkout flow

### Goals for v1.0.0
- [ ] Publish packages to npm
- [ ] Release `create-ucp` CLI
- [ ] Comprehensive documentation site
- [ ] Video tutorials
- [ ] Production-ready examples

## 🔄 Development Process

### Issue-Driven Development
All features and bugs are tracked via [GitHub Issues](https://github.com/BarreraSlzr/marketing-ucp/issues). Issues include:
- Clear problem statement
- Acceptance criteria
- Technical design notes
- Related issues (dependencies, blockers)

### Open Development
- All code is developed in public
- Pull requests are reviewed by maintainers
- Changes documented in commit messages
- Breaking changes noted in PR descriptions

### Branch Strategy
- `main` - Production-ready code
- Feature branches for new work
- Merged via PR after review

## 📖 Documentation

### Current Documentation
- [README.md](../README.md) - Quick start and overview
- [architecture.md](./architecture.md) - System design and patterns
- [entities.md](./entities.md) - Entity schemas and types
- [workflows.md](./workflows.md) - Checkout workflow patterns
- [headless-api.md](./headless-api.md) - API endpoint documentation
- [payment-handlers.md](./payment-handlers.md) - Handler implementation guide

### Planned Documentation
- Getting Started tutorial
- API Reference (auto-generated from code)
- Integration guides (Polar, Shopify, custom handlers)
- Deployment guide (Vercel, self-hosted)
- Video walkthroughs

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- How to pick up an issue
- Pull request process

## 📮 Feedback & Questions

- **Bug reports**: [Open an issue](https://github.com/BarreraSlzr/marketing-ucp/issues/new)
- **Feature requests**: [Open an issue](https://github.com/BarreraSlzr/marketing-ucp/issues/new) with your proposal
- **Questions**: Comment on relevant issues or open a new one

## 🗺️ Long-Term Vision

UCP aims to become the standard protocol for stateless, portable commerce experiences:

1. **Universal Adoption**: Integrate with all major payment and fulfillment providers
2. **Protocol Standardization**: Define formal specification for URL-driven commerce
3. **Ecosystem Growth**: Enable third-party integrations and extensions
4. **Developer Experience**: Make it trivial to add checkout to any app
5. **Trustless Commerce**: Cryptographic receipts prove execution integrity

---

**Last Updated**: 2026-02-07  
**Current Version**: v0.1.0  
**Next Milestone**: Pipeline Observability (v0.2.0)
