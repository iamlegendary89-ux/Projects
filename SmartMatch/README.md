# SmartMatch PWA Documentation

Welcome to the comprehensive documentation for the SmartMatch PWA - an AI-powered smartphone recommendation engine.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./01-architecture.md) | System overview, data flow, tech stack |
| [Component Library](./02-components.md) | All UI components with props and usage |
| [Developer Guide](./03-developer-guide.md) | Setup, environment, development workflow |
| [API Reference](./04-api-reference.md) | Server actions and API routes |
| [Data Pipeline](./05-data-pipeline.md) | Discovery → Enrichment → OSET → Sync |
| [OSET Algorithm](./06-oset-algorithm.md) | Scoring system and formulas |
| [Database Schema](./07-database.md) | Tables, relationships, migrations |
| [Deployment](./08-deployment.md) | Vercel, CI/CD, production setup |

## Quick Links

- **Source Code**: `d:\Projects\smartmatch-pwa`
- **Framework**: Next.js 16 + React 19
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS + Framer Motion

## Project Overview

SmartMatch is a Progressive Web Application that helps users find their perfect smartphone through:

1. **AI-Powered Quiz** - Adaptive questioning to understand user preferences
2. **OSET Scoring** - 7-attribute scoring system with real-time normalization
3. **Regret Analysis** - User sentiment aggregation from Reddit, XDA, YouTube
4. **Rankings** - Sortable leaderboard with hero images

---

*Generated: December 13, 2025*
