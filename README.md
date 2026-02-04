# Adverse Media Screening Tool

An automated adverse media screening platform for compliance teams, built with Next.js, Supabase, and AI integrations.

## Features

### Core Screening
- **Subject Input**: Manual single-entry form with comprehensive fields
- **Batch Processing**: CSV upload for bulk screening
- **Search Integration**: Dual provider support (SerpAPI + Google Custom Search)
- **AI Analysis**: Claude and OpenAI with automatic fallback

### Review System
- **Review Queue**: Prioritized list of screenings awaiting review
- **Article Cards**: AI-generated summaries with confidence scores
- **Review Actions**: Confirm Match, Exclude, Escalate, Clear, Flag
- **Decision Recording**: Final decisions with audit trail

### Admin Dashboard
- **Activity Feed**: Real-time monitoring of all user actions
- **User Management**: Role assignment, activation/deactivation
- **All Screenings**: Searchable list with filters
- **Audit Log**: Complete exportable audit trail

### Comprehensive Search Taxonomy
11 categories of adverse media keywords:
1. Financial Crimes (fraud, embezzlement, money laundering)
2. Violent Crimes (murder, assault, kidnapping)
3. Organized Crime (trafficking, cartels, racketeering)
4. Terrorism & Security (sanctions, extremism)
5. Sexual Offenses
6. Legal/Criminal Proceedings
7. Regulatory Actions
8. Civil/Business Issues
9. Reputational/Ethical
10. Environmental Crimes
11. Cyber Crimes

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **AI**: Anthropic Claude, OpenAI GPT-4
- **Search**: SerpAPI, Google Custom Search
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- API keys for:
  - SerpAPI
  - Google Custom Search (optional)
  - Anthropic Claude
  - OpenAI (optional, for fallback)

### Installation

1. Clone the repository:
```bash
cd adverse-media-app
npm install
```

2. Copy environment variables:
```bash
cp env.example.txt .env.local
```

3. Configure your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

SERPAPI_API_KEY=your_serpapi_key
GOOGLE_CSE_API_KEY=your_google_cse_key
GOOGLE_CSE_CX=your_search_engine_id

ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key
```

4. Set up the database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run `supabase/schema.sql`
   - Run `supabase/seed-search-terms.sql`

5. Start the development server:
```bash
npm run dev
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Analyst** | Submit screenings, review results, make decisions |
| **Senior Analyst** | All Analyst + handle escalations, override decisions |
| **Admin** | Full access + user management, system configuration |
| **Auditor** | Read-only access to all records and audit trails |
| **API User** | Programmatic access only |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login pages
│   ├── (dashboard)/      # Analyst dashboard
│   ├── (admin)/          # Admin panel
│   └── api/              # API routes
├── components/
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Sidebar, header
│   └── review/           # Review-specific components
├── lib/
│   ├── supabase/         # Database clients
│   ├── search/           # Search services
│   └── ai/               # AI integrations
└── types/                # TypeScript types
```

## API Routes

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Screening
- `POST /api/screening/submit` - Submit new screening
- `POST /api/screening/batch` - Batch CSV upload
- `GET /api/screening/[id]` - Get screening details
- `GET /api/screening/queue` - Get review queue

### Search & Analysis
- `POST /api/search/execute` - Run search queries
- `POST /api/analysis/run` - Run AI analysis

### Review
- `POST /api/review/action` - Submit review action
- `POST /api/review/decision` - Submit final decision

### Reports
- `GET /api/reports/individual/[id]` - Generate screening report

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/activity` - Activity feed
- `GET /api/admin/audit-log` - Audit trail

## Database Schema

Key tables:
- `user_profiles` - User accounts and roles
- `screening_subjects` - Subjects being screened
- `search_results` - Raw search results
- `article_analyses` - AI analysis results
- `reviews` - Human review actions
- `screening_decisions` - Final decisions
- `audit_logs` - Complete audit trail
- `search_term_categories` - Keyword taxonomy
- `search_terms` - Individual search terms

## Security Features

- Row Level Security (RLS) on all tables
- Role-based access control
- Complete audit logging
- Session management via Supabase Auth
- Encrypted data at rest and in transit

## License

Proprietary - All rights reserved.
