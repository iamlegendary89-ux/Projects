# Deployment Guide

Complete guide for deploying SmartMatch PWA to production.

---

## Deployment Options

| Platform | Best For | Complexity |
|----------|----------|------------|
| Vercel | Primary (recommended) | Low |
| Netlify | Alternative hosting | Low |
| Docker | Self-hosted | Medium |
| AWS/GCP | Enterprise scale | High |

---

## Vercel Deployment

### Prerequisites

1. Vercel account
2. GitHub repository connected
3. Supabase project with database

### Step 1: Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

### Step 2: Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...@db.xxx.supabase.co:5432/postgres` | All |
| `CSE_API_KEY` | Google API key | All |
| `CSE_ENGINE_ID` | Search engine ID | All |
| `DEEPSEEK_API_KEY` | DeepSeek API key | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | All |

### Step 3: Configure Build

`vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "crons": [{
    "path": "/api/cron/pipeline",
    "schedule": "0 4 * * *"
  }]
}
```

### Step 4: Deploy

```bash
# Production deployment
vercel --prod

# Preview deployment
vercel
```

---

## Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note connection string from Settings → Database

### 2. Apply Migrations

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"

# Run migrations
npm run db:migrate
```

### 3. Initial Data Sync

```bash
# Sync processed data to Supabase
npm run pipeline:sync
```

---

## CI/CD Pipeline

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 4 * * *'  # Daily at 4 AM UTC

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run QA checks
        run: npm run quality
      
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitLab CI

`.gitlab-ci.yml` (already included in repo):

```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm run quality

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - .next/

deploy:
  stage: deploy
  script:
    - npx vercel --prod --token=$VERCEL_TOKEN
  only:
    - main
```

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing (`npm run test:unit`)
- [ ] Type check passing (`npm run qa:type-check`)
- [ ] Lint passing (`npm run qa:lint`)
- [ ] Environment variables set in Vercel
- [ ] Database migrated
- [ ] Data synced to production database

### Post-Deployment

- [ ] Verify homepage loads
- [ ] Verify rankings page loads data
- [ ] Verify phone details pages work
- [ ] Test share functionality
- [ ] Test feedback buttons
- [ ] Check performance (Core Web Vitals)

---

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard → Analytics:
- Page views
- Web Vitals
- Function invocations

### Error Tracking

Recommended: Sentry

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Database Monitoring

Supabase Dashboard provides:
- Query performance
- Connection pooling stats
- Storage usage

---

## Scaling

### Edge Functions

For global latency, deploy API routes to edge:

```typescript
// app/api/rankings/route.ts
export const runtime = 'edge';
```

### Caching

Next.js ISR (Incremental Static Regeneration):

```typescript
// app/onyx/rankings/page.tsx
export const revalidate = 3600; // Revalidate every hour
```

### Database Connection Pooling

Use Supabase connection pooler for serverless:

```
DATABASE_URL=postgresql://postgres.xxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

## Rollback

### Vercel Rollback

1. Go to Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

### Database Rollback

1. Data is stored in `full_data` JSONB column
2. JSON files in `data/processed_content/` serve as backup
3. Re-run sync: `npm run pipeline:sync`

---

## Domain Setup

### Custom Domain

1. Vercel Dashboard → Settings → Domains
2. Add domain: `smartmatch.app`
3. Configure DNS:
   - `A` record → `76.76.21.21`
   - `CNAME` for `www` → `cname.vercel-dns.com`

### SSL

Automatic with Vercel (Let's Encrypt).

---

## Cost Estimation

### Vercel (Hobby/Pro)

| Tier | Cost | Limits |
|------|------|--------|
| Hobby | Free | 100GB bandwidth, 10s functions |
| Pro | $20/mo | 1TB bandwidth, 60s functions |

### Supabase

| Tier | Cost | Limits |
|------|------|--------|
| Free | $0 | 500MB DB, 2GB bandwidth |
| Pro | $25/mo | 8GB DB, unlimited bandwidth |

### Estimated Monthly

- **Low Traffic**: Free tier viable
- **Moderate Traffic**: ~$45/mo (Vercel Pro + Supabase Pro)
- **High Traffic**: ~$100+/mo (enterprise tiers)
