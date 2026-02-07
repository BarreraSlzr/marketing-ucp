# UCP Demo Guide

This guide helps you demonstrate the Universal Checkout Protocol (UCP) to stakeholders, users, or potential contributors.

## Quick Demo Flow (5 minutes)

### 1. Show the Homepage (http://localhost:3000)

**Key Points to Highlight**:
- **Hero Section**: Emphasize "One checkout protocol for every service"
- **Stats Bar**: Point out "0 Server-side sessions" - everything is stateless
- **Templates Section**: Show pre-built checkout templates that work with URL parameters
- **Roadmap Section**: NEW - Shows transparent development progress with links to GitHub issues

### 2. Launch a Template Checkout

Click any template (e.g., "Flower Shop") to see:
- URL updates instantly with all product data
- Every field is in the URL - no hidden state
- Copy and share the URL - it's fully resumable
- Works without JavaScript (progressive enhancement)

**Demo Script**:
> "Notice how the URL contains all the checkout data. You can bookmark this, share it with a friend, or come back to it later. No session cookies, no database lookups - everything needed is in the URL."

### 3. Show the Product Creator

Navigate to "Create Product" to demonstrate:
- Form fields sync to URL in real-time
- Template selector for quick starts
- Generated checkout link preview
- Shareable product URL

**Demo Script**:
> "This shows how merchants can create products using URL-driven state. Every field you fill updates the URL. When you're done, you get a checkout link that works immediately."

### 4. Navigate Through a Checkout Flow

1. Fill in buyer information
2. Add billing address  
3. Add payment details
4. Show URL updating in real-time

**Key Points**:
- Each section validates independently with Zod
- URL serialization happens automatically via nuqs
- Works without JavaScript but enhanced with it
- Type-safe from URL → Zod schema → TypeScript types

### 5. Highlight the Roadmap (NEW)

Scroll to the "Current Progress & Roadmap" section:

**Foundation Complete ✅**:
- URL-driven state management
- Zod validation schemas
- Composable UI components

**In Development**:
- Pipeline Observability (Issues #5-6)
  - Event logging for all pipeline steps
  - Checksum verification
  - TracedStep instrumentation

**Coming Soon**:
- Visual Dashboard (Issues #7-10)
- npm Publishing (Issue #11)
- create-ucp CLI (Issue #12)

**Demo Script**:
> "We're building in public with full transparency. Each feature links to its GitHub issue where you can see discussions, technical decisions, and progress. Click any issue link to dive deeper."

### 6. Show the Development Section

Highlight the new "Built with transparency" section:
- Link to contribution guide
- Link to source code
- Link to documentation

**Demo Script**:
> "Everything is open source. You can contribute, fork for your needs, or just follow along. The CONTRIBUTING.md has everything you need to get started."

## Technical Deep Dive (15 minutes)

### Show the Code Structure

```
marketing-ucp/
├── app/                    # Next.js pages - check out page.tsx for homepage
├── packages/
│   ├── entities/          # Zod schemas - start here to see type definitions
│   ├── polar/             # Polar payment integration
│   ├── shopify/           # Shopify integration
│   └── ui/                # Reusable components
├── docs/                  # NEW: development-status.md shows roadmap
└── CONTRIBUTING.md        # NEW: How to contribute
```

### Show a Zod Schema

Open `packages/entities/buyer.zod.ts`:
- TypeScript types inferred from Zod
- Runtime validation
- Used by both server actions and nuqs parsers

### Show URL State Management

Open `packages/entities/parsers.ts`:
- nuqs parsers for each entity
- Automatic URL serialization/deserialization
- Type-safe state management

### Show Server Actions

Open `app/actions.ts`:
- Validates with Zod
- Processes checkout steps
- Returns success/error responses

## Key Messages for Different Audiences

### For Developers
- **Type Safety**: Zod → TypeScript end-to-end
- **No State Complexity**: URL is the single source of truth
- **Easy Integration**: Just install packages (coming soon to npm)
- **Open Development**: All decisions tracked in GitHub issues

### For Merchants
- **Shareable Checkouts**: Send customers a link with everything pre-filled
- **No Sessions**: Works across devices, browsers, and time
- **Multi-Service**: Integrate Shopify, Polar, or any provider
- **Transparent**: See exactly what's happening at each step

### For Product Managers
- **Rapid Prototyping**: Templates let you demo flows immediately
- **Clear Roadmap**: Public issue tracking shows what's next
- **Incremental Delivery**: Foundation is done, observability next
- **Community Driven**: Open to contributions and feedback

## Demo Environments

### Local Development
```bash
pnpm install
pnpm dev
# Open http://localhost:3000
```

### Production (Vercel)
- Push to main branch
- Vercel auto-deploys
- Check deployment in Vercel dashboard

### Branch Previews
- Open PR → Vercel creates preview deployment
- Share preview link for feedback
- Perfect for showing work-in-progress features

## Common Questions & Answers

**Q: Why no server-side sessions?**
> A: Sessions create scaling problems and prevent link sharing. UCP's URL-driven approach makes checkouts portable, resumable, and infinitely scalable.

**Q: Is it secure to put data in URLs?**
> A: Sensitive data like credit card numbers are never in URLs. Payment tokens and references are used instead. The URL contains only what's needed to render the form.

**Q: How do you handle state updates?**
> A: nuqs automatically syncs form state to URL params. When the URL changes, React re-renders with new state. It's declarative and predictable.

**Q: What's next for UCP?**
> A: Check the roadmap section on the homepage! We're currently building pipeline observability (#5-6), then a visual dashboard (#7-10), then npm publishing (#11) and CLI tools (#12).

**Q: Can I contribute?**
> A: Absolutely! Read CONTRIBUTING.md, pick an issue, and submit a PR. We welcome all contributions and build in public.

## Troubleshooting Demo Issues

### Dev Server Won't Start
```bash
# Clean install
rm -rf node_modules
pnpm install
pnpm dev
```

### Build Fails
- Check for TypeScript errors: `pnpm lint`
- Google Fonts might be blocked in some environments - this is OK for demos

### Template Links Don't Work
- Make sure you're on the homepage (`/`)
- Check that JavaScript is enabled for real-time URL sync
- Templates work without JS but are enhanced with it

## Next Steps After Demo

1. **Share the repo**: https://github.com/BarreraSlzr/marketing-ucp
2. **Show the issues**: Point to specific issues they might care about
3. **Invite to contribute**: Point to CONTRIBUTING.md
4. **Follow up**: Share branch preview links as features ship

---

**Pro Tip**: Keep the GitHub Issues page open in another tab. When someone asks "what about X feature?", you can immediately show the issue where it's being discussed or planned.
