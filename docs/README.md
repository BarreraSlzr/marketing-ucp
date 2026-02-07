# Documentation System

This directory contains markdown documentation files that are automatically served via the `/docs` route in the Next.js application.

## Features

### For Humans (Web Browser)
- Browse documentation at `/docs`
- View individual documents at `/docs/[slug]`
- Syntax-highlighted code blocks
- GitHub Flavored Markdown support
- Clean, responsive UI

### For Agents/MCP Tools (API)
- List all docs: `GET /api/docs` (returns JSON)
- Get raw markdown: `GET /api/docs/[slug]?format=raw` (returns `text/markdown`)
- Download markdown: `GET /api/docs/[slug]` (triggers download)

## Adding New Documentation

1. Create a new `.md` file in this directory
2. Optionally add frontmatter for metadata:
   ```markdown
   ---
   title: Your Document Title
   description: A brief description
   ---
   
   # Your Document Title
   
   Content goes here...
   ```
3. The document will automatically appear in the docs index

## Supported Markdown Features

- **Headers** (H1-H6)
- **Lists** (ordered and unordered)
- **Code blocks** with syntax highlighting
- **Tables** (GitHub Flavored Markdown)
- **Links** and **images**
- **Blockquotes**
- **Task lists** (- [ ] and - [x])
- **Strikethrough** (~~text~~)

## Technical Details

### Stack
- **MDX Support**: `@next/mdx` with Rust compiler
- **Markdown Rendering**: `react-markdown` with `remark-gfm`
- **Syntax Highlighting**: `react-syntax-highlighter`
- **Frontmatter Parsing**: `gray-matter`

### File Structure
```
lib/docs/
  docs.ts          # Core utilities for reading markdown files

app/[locale]/docs/
  page.tsx         # Documentation index
  [slug]/
    page.tsx       # Individual document viewer
    markdown-renderer.tsx  # Client-side markdown renderer

app/api/docs/
  route.ts         # List all docs (JSON API)
  [slug]/
    route.ts       # Serve individual doc as markdown
```

### Content-Type Headers

When agents/tools request documentation via the API:
- `Content-Type: text/markdown; charset=utf-8`
- `X-Doc-Title: [Document Title]`
- `X-Doc-Slug: [slug]`

This makes it easy for MCP tools and AI agents to:
1. Discover available documentation (`GET /api/docs`)
2. Fetch raw markdown for processing (`GET /api/docs/[slug]?format=raw`)
3. Parse and understand the documentation structure

## Example Usage

### For Web Users
Visit: `http://localhost:3000/docs`

### For Agents/MCP Tools
```bash
# List all available docs
curl http://localhost:3000/api/docs

# Get raw markdown
curl http://localhost:3000/api/docs/development-status?format=raw

# Download markdown file
curl -O http://localhost:3000/api/docs/architecture
```

## Navigation

Documentation is integrated into the main site:
- **Nav bar**: "Docs" link in header
- **Homepage**: "Read Documentation" button in Development section
- **Footer**: Links to key documentation pages

## Priority Ordering

Documents are displayed in this priority order:
1. development-status
2. architecture
3. entities
4. workflows
5. demo-guide
6. (other docs alphabetically)

To change the order, update the `priorityOrder` array in `lib/docs/docs.ts`.
