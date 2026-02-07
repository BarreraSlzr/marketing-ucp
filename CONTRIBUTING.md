# Contributing to UCP

Thank you for your interest in contributing to the Universal Checkout Protocol! This document provides guidelines and information about how to contribute.

## 🎯 Project Vision

UCP aims to be a universal, URL-driven checkout protocol that works across any commerce platform. We value:

- **Transparency**: All development happens in public via GitHub issues
- **Simplicity**: KISS (Keep It Simple, Stupid) principle guides our architecture
- **Maintainability**: DRY (Don't Repeat Yourself) keeps code clean and reusable
- **Type Safety**: Full end-to-end TypeScript with Zod validation
- **Statelessness**: URL-first state management with no server sessions

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- pnpm (recommended) or npm
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/BarreraSlzr/marketing-ucp.git
cd marketing-ucp

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at http://localhost:3000

### Project Structure

```
marketing-ucp/
├── app/                    # Next.js App Router pages and routes
├── components/             # Shared React components
├── packages/
│   ├── entities/          # Zod schemas, types, and URL parsers
│   ├── polar/             # Polar payment integration
│   ├── shopify/           # Shopify Storefront integration
│   └── ui/                # Reusable UI components
├── docs/                  # Architecture and API documentation
├── messages/              # i18n translations (en-US, es-ES)
└── tests/                 # Integration tests
```

## 📋 Development Workflow

### 1. Check Existing Issues

Before starting work, check [open issues](https://github.com/BarreraSlzr/marketing-ucp/issues) to see if your idea is already being discussed or worked on.

### 2. Create or Comment on an Issue

- For bugs: Create a new issue with reproduction steps
- For features: Propose the feature and discuss the approach
- For questions: Use GitHub Discussions or open an issue

### 3. Fork and Branch

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/marketing-ucp.git

# Create a feature branch
git checkout -b feature/your-feature-name
```

### 4. Make Your Changes

- Follow the existing code style and patterns
- Write clear, descriptive commit messages
- Add tests for new functionality when applicable
- Update documentation if you change APIs or behavior

### 5. Test Your Changes

```bash
# Run linter
pnpm lint

# Run tests
pnpm test

# Build to verify
pnpm build
```

### 6. Submit a Pull Request

- Push your branch to your fork
- Open a PR against the `main` branch
- Link any related issues in the PR description
- Respond to review feedback promptly

## 🎨 Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use Zod schemas for runtime validation
- Export types alongside schemas

### React Components

- Prefer Server Components by default
- Use Client Components (`"use client"`) only when needed
- Co-locate styles with components using CSS modules
- Follow existing naming conventions

### CSS

- Use CSS modules (`.module.css`) for component styles
- Use Tailwind `@apply` directive for utility composition
- Reference `theme.css` using `@reference` directive
- Keep styles co-located with components

### Commits

- Write clear, concise commit messages
- Use conventional commit format when possible:
  - `feat: add new feature`
  - `fix: resolve bug in X`
  - `docs: update README`
  - `style: format code`
  - `refactor: improve X implementation`
  - `test: add tests for Y`

## 📝 Working on Issues

### Priority Levels

Issues are labeled by priority:
- **P0**: Critical - blocking core functionality
- **P1**: High - important for upcoming release
- **P2**: Medium - planned but not urgent
- **P3**: Low - nice to have

### Issue Labels

- `enhancement`: New features or improvements
- `bug`: Something isn't working correctly
- `documentation`: Documentation updates
- `dx`: Developer experience improvements
- `pipeline`: Related to pipeline/observability
- `dashboard`: Related to dashboard UI

## 🧪 Testing

- Write tests for new schemas and utilities
- Use `bun test` or `pnpm test` to run tests
- Place tests in `__tests__` directories or alongside source files

## 📚 Documentation

- Update relevant docs in `/docs` if you change architecture
- Update README if you add new scripts or configuration
- Keep API documentation in sync with code
- Add JSDoc comments for exported functions and types

## 🤝 Code Review Process

All contributions go through code review:

1. Maintainers will review your PR within a few days
2. Address feedback and push updates to your branch
3. Once approved, a maintainer will merge your PR
4. Your contribution will be part of the next release!

## 💡 Need Help?

- Check existing [documentation](./docs)
- Read through [closed issues](https://github.com/BarreraSlzr/marketing-ucp/issues?q=is%3Aissue+is%3Aclosed)
- Open a new issue with your question
- Join discussions in issue comments

## 📄 License

By contributing to UCP, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors are recognized in:
- Git commit history
- GitHub contributors page
- Release notes for significant contributions

Thank you for helping make UCP better for everyone! 🎉
