# Developer Guide

Complete setup and development workflow for SmartMatch PWA.

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 8.0.0 |
| Git | Latest |

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/iamlegendary89-ux/smartmatch-pwa.git
cd smartmatch-pwa

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Create `.env.local` with these variables:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# Google Custom Search Engine
CSE_API_KEY=your_google_api_key
CSE_ENGINE_ID=your_search_engine_id

# DeepSeek AI (for enrichment)
DEEPSEEK_API_KEY=sk-xxx

# OpenRouter (alternative AI)
OPENROUTER_API_KEY=sk-or-xxx

# Supabase (optional, for auth)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Worker (Cloudflare)
WORKER_URL=https://your-worker.workers.dev
API_SECRET=your_api_secret
```

---

## NPM Scripts Reference

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build (with lint + typecheck) |
| `npm run start` | Run production server |

### Quality Assurance

| Command | Description |
|---------|-------------|
| `npm run qa:lint` | ESLint check |
| `npm run qa:lint:fix` | ESLint auto-fix |
| `npm run qa:type-check` | TypeScript check |
| `npm run qa:format` | Prettier format |
| `npm run quality` | Run all QA checks |

### Testing

| Command | Description |
|---------|-------------|
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:performance` | Run performance tests |
| `npm run test:coverage` | Generate coverage report |

### Data Pipeline

| Command | Description |
|---------|-------------|
| `npm run pipeline` | Run full pipeline |
| `npm run pipeline:discover` | Discovery phase only |
| `npm run pipeline:enrich` | Enrichment phase only |
| `npm run pipeline:sync` | Database sync only |
| `npm run pipeline:full` | Pipeline + git commit + push |

### Database

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:reset` | Reset database (DESTRUCTIVE) |
| `npm run db:studio` | Open Drizzle Studio |

---

## Project Configuration

### TypeScript (`tsconfig.json`)

Key settings:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Path aliases:
- `@/*` → `./app/*`
- `@/components/*` → `./components/*`
- `@/lib/*` → `./lib/*`
- `@/hooks/*` → `./hooks/*`

### ESLint (`eslint.config.mjs`)

- TypeScript-ESLint rules enabled
- Prettier integration
- React Hooks linting

### Tailwind (`tailwind.config.js`)

Custom theme extensions in `tailwind.config.js`.

---

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes...

# Pre-commit runs automatically (lint + typecheck)
git add .
git commit -m "feat: my feature"

# Push and create PR
git push origin feature/my-feature
```

### 2. Running Pipeline

```bash
# Full pipeline (discover → enrich → OSET → sync)
npm run pipeline

# Only sync existing data to database
npm run pipeline:sync

# With image processing disabled
npm run pipeline:sync:no-images
```

### 3. Database Development

```bash
# Make schema changes in lib/db/schema.ts

# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# View data in studio
npm run db:studio
```

---

## Pre-commit Hooks

Husky runs these checks before each commit:

1. **ESLint** - Lints `scripts/*.ts`
2. **TypeScript** - Type checks entire project
3. **Commit Message** - Validates format

Commit message format: `type: description`

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`

---

## Debugging

### Next.js

```bash
# Enable debug mode
DEBUG=* npm run dev
```

### Database Queries

```typescript
// In lib/db/index.ts, add logging:
import { drizzle } from 'drizzle-orm/postgres-js';
import { logger } from 'drizzle-orm';

export const db = drizzle(client, { logger: true });
```

### Pipeline Scripts

All pipeline scripts log to:
- Console (real-time)
- `log_discovery.txt`
- `log_enrichment.txt`
- `log_oset.txt`
- `log_sync.txt`

---

## Common Issues

### "Module not found: @/hooks/*"

Ensure `hooks/` is in tsconfig include:
```json
"include": ["hooks/**/*.ts"]
```

### Database connection error

1. Check `DATABASE_URL` in `.env.local`
2. Verify Supabase is running
3. Run `npm run db:migrate`

### Pre-commit hook fails

```bash
# Skip hooks temporarily
git commit --no-verify -m "wip"
```

---

## IDE Setup

### VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer
- Prisma (for schema highlighting)

### Recommended Settings

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```
