# FacturAI — AI-Powered e-Factura Compliance Assistant

## Project Identity

- **Name**: FacturAI
- **Tagline**: e-Factura cu inteligență artificială. Simplu. Rapid. Fără amenzi.
- **Domain**: facturai.ro
- **Repository**: github.com/sabinbobu/facturai
- **Author**: Sabin Bobu

## What This Project Does

FacturAI is a web application that helps Romanian micro-businesses (PFAs, small SRLs) comply with mandatory e-Factura obligations. It provides:

1. **Invoice creation** via a simple form (no XML/accounting knowledge needed)
2. **UBL 2.1 XML generation** compliant with RO_CIUS national specification
3. **ANAF SPV submission** via the official e-Factura API (OAuth2 + REST)
4. **AI fiscal chatbot** that explains errors, deadlines, and compliance rules in plain Romanian
5. **Deadline tracking** with proactive alerts before the 5-working-day submission window expires
6. **10-year compliant archive** for original + ANAF-signed XML files

## Target Users

- PFAs (Persoane Fizice Autorizate) issuing 1–10 invoices/month
- Micro SRLs (1–5 employees) under €500K turnover
- Accounting firms managing 20–50 micro-business clients
- Key deadline: July 1, 2026 — full e-Factura enforcement for SMEs under €500K

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript 5
- **Build tool**: Vite 5
- **UI components**: shadcn/ui
- **Styling**: Tailwind CSS 3
- **State management**: React Query (TanStack Query) for server state
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database ORM**: Supabase Python client (supabase-py)
- **HTTP client**: httpx (async, for ANAF API calls)
- **XML generation**: lxml (for UBL 2.1 XML building + XSD validation)
- **Background jobs**: Celery + Redis
- **Scheduling**: Celery Beat (daily deadline recalculation)
- **AI chatbot**: Anthropic Claude API (claude-haiku for cost efficiency)

### Database & Auth
- **Database**: Supabase (PostgreSQL 15)
- **Auth**: Supabase Auth (email + password)
- **Storage**: Supabase Storage (for XML archive)
- **Row Level Security**: Enabled on all tables

### Infrastructure
- **Hosting**: Railway (EU region) or Fly.io
- **Redis**: Railway Redis add-on
- **Email**: Resend (transactional emails + deadline alerts)
- **SMS** (Phase 2): Twilio
- **Monitoring**: Sentry (error tracking) + PostHog (product analytics)
- **CI/CD**: GitHub Actions

### External APIs
- **ANAF e-Factura API**: api.anaf.ro (production) / api.anaf.ro/test (sandbox)
- **ANAF OAuth2**: logincert.anaf.ro/anaf-oauth2/v1/
- **ANAF Company Lookup**: webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva (free, no auth)
- **ANAF XML-to-PDF**: api.anaf.ro/prod/FCTEL/rest/transformare/FACT1
- **Anthropic Claude API**: api.anthropic.com/v1/messages (for AI chatbot)

## Project Structure

```
facturai/
├── frontend/                         # React + Vite + TypeScript
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components (Button, Input, Card, etc.)
│   │   │   ├── layout/              # Sidebar, Topbar, PageLayout
│   │   │   ├── invoice/             # InvoiceForm, InvoiceList, InvoiceDetail, InvoicePreview
│   │   │   ├── client/              # ClientSearch, ClientForm, CUILookup
│   │   │   ├── dashboard/           # StatsCard, DeadlineWarning, RiskScore, ActivityFeed
│   │   │   ├── chat/                # ChatWindow, ChatMessage, QuickQuestions
│   │   │   └── archive/             # ArchiveList, ArchiveDownload
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── InvoicesPage.tsx
│   │   │   ├── InvoiceNewPage.tsx
│   │   │   ├── InvoiceDetailPage.tsx
│   │   │   ├── ClientsPage.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   ├── ArchivePage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── LandingPage.tsx
│   │   ├── hooks/
│   │   │   ├── useInvoices.ts        # CRUD + status polling
│   │   │   ├── useClients.ts         # Client management + CUI lookup
│   │   │   ├── useAnafAuth.ts        # ANAF connection status
│   │   │   ├── useChat.ts            # AI chatbot state
│   │   │   ├── useDashboard.ts       # Dashboard stats
│   │   │   └── useAlerts.ts          # Deadline alerts
│   │   ├── lib/
│   │   │   ├── api.ts                # Axios/fetch client for backend API
│   │   │   ├── supabase.ts           # Supabase client init
│   │   │   ├── utils.ts              # Formatters, date helpers
│   │   │   └── constants.ts          # Status enums, VAT rates, county codes
│   │   ├── types/
│   │   │   ├── invoice.ts
│   │   │   ├── client.ts
│   │   │   ├── organization.ts
│   │   │   └── compliance.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                 # Tailwind imports
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                          # FastAPI (Python)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app entry point, CORS, middleware
│   │   ├── config.py                 # Environment variables via pydantic-settings
│   │   ├── dependencies.py           # Shared dependencies (DB session, current user)
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── invoices.py           # CRUD + generate XML + submit + status
│   │   │   ├── clients.py            # CRUD + CUI lookup from ANAF
│   │   │   ├── organizations.py      # Company profile management
│   │   │   ├── anaf_auth.py          # OAuth2 flow: connect, callback, status
│   │   │   ├── chat.py               # AI chatbot endpoint (proxies to Claude API)
│   │   │   ├── dashboard.py          # Stats, deadlines, recent activity
│   │   │   └── archive.py            # Archive listing, download
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── xml_builder.py        # UBL 2.1 XML generation with lxml
│   │   │   ├── xml_validator.py      # Schematron validation against RO_CIUS
│   │   │   ├── anaf_client.py        # ANAF e-Factura API calls (upload, status, download)
│   │   │   ├── anaf_oauth.py         # OAuth2 token management (get, refresh, store)
│   │   │   ├── cui_lookup.py         # ANAF public company info API
│   │   │   ├── pdf_generator.py      # ANAF XML-to-PDF conversion
│   │   │   ├── archive_service.py    # Supabase Storage management
│   │   │   ├── deadline_engine.py    # Romanian business day calculator + deadline rules
│   │   │   ├── chat_service.py       # Claude API integration for AI chatbot
│   │   │   └── notifications.py      # Email alerts via Resend
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── invoice.py            # Pydantic schemas for invoice CRUD
│   │   │   ├── client.py             # Pydantic schemas for client
│   │   │   ├── organization.py       # Pydantic schemas for org/company
│   │   │   └── chat.py               # Pydantic schemas for chat messages
│   │   └── tasks/
│   │       ├── __init__.py
│   │       ├── poll_anaf.py          # Background: poll ANAF for invoice status
│   │       ├── daily_deadlines.py    # Cron: recalculate deadlines, send alerts
│   │       └── send_alerts.py        # Send email/SMS notifications
│   ├── tests/
│   │   ├── test_xml_builder.py       # Validate generated XML against XSD
│   │   ├── test_deadline_engine.py   # Business day calculator edge cases
│   │   ├── test_cui_lookup.py        # CUI validation
│   │   └── test_invoices.py          # Invoice CRUD API tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # All tables, RLS policies, indexes
│
├── docs/
│   ├── ARCHITECTURE.md               # Technical architecture overview
│   ├── ANAF_INTEGRATION.md           # ANAF API details, OAuth flow, endpoints
│   ├── DEPLOYMENT.md                 # Railway/Fly.io deployment guide
│   └── API.md                        # Backend API endpoint documentation
│
├── .github/
│   └── workflows/
│       ├── frontend.yml              # Build + test frontend
│       └── backend.yml               # Lint + test backend
│
├── docker-compose.yml                # Local dev: Redis + Celery worker
├── CLAUDE.md                         # THIS FILE — project context for Claude Code
├── README.md                         # Public README
└── .gitignore
```

## Database Schema (Supabase/PostgreSQL)

### Table: organizations
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    cui VARCHAR(20) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    trade_register_nr VARCHAR(50),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_county VARCHAR(5),          -- ISO county code: CJ, B, TM, etc.
    address_postal_code VARCHAR(6),
    vat_registered BOOLEAN DEFAULT false,
    bank_account VARCHAR(34),           -- IBAN
    bank_name VARCHAR(100),
    anaf_access_token TEXT,             -- Encrypted
    anaf_refresh_token TEXT,            -- Encrypted
    anaf_token_expires_at TIMESTAMPTZ,
    invoice_series VARCHAR(20) DEFAULT 'FACT',
    next_invoice_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: clients
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    cui VARCHAR(20),                    -- Nullable for B2C (individuals)
    name VARCHAR(255) NOT NULL,
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_county VARCHAR(5),
    address_postal_code VARCHAR(6),
    email VARCHAR(255),
    is_company BOOLEAN DEFAULT true,    -- true=B2B, false=B2C
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: invoices
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',
    status VARCHAR(20) DEFAULT 'draft', -- draft/generated/uploaded/pending/accepted/rejected/archived
    invoice_type VARCHAR(5) DEFAULT 'b2b', -- b2b/b2c/b2g
    subtotal_amount NUMERIC(12,2) DEFAULT 0,
    vat_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    xml_content TEXT,                   -- Generated UBL XML
    anaf_upload_id VARCHAR(50),         -- id_incarcare from ANAF
    anaf_download_id VARCHAR(50),       -- id_descarcare from ANAF
    anaf_response_xml TEXT,             -- Signed XML or error response
    anaf_error_message TEXT,
    submitted_at TIMESTAMPTZ,
    deadline_date DATE,                 -- 5 working days from issue_date
    archived_xml_path VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: invoice_lines
```sql
CREATE TABLE invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    line_number INTEGER NOT NULL,
    description VARCHAR(500) NOT NULL,
    quantity NUMERIC(10,3) NOT NULL,
    unit_code VARCHAR(10) DEFAULT 'H87', -- UBL unit: H87=piece, HUR=hour
    unit_price NUMERIC(12,2) NOT NULL,
    vat_rate NUMERIC(5,2) DEFAULT 19.00,
    vat_category_code VARCHAR(5) DEFAULT 'S', -- S=standard, Z=zero, E=exempt
    line_total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: chat_messages
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(10) NOT NULL,          -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## ANAF API Reference (Quick Reference)

### Authentication
- OAuth2 Authorization: `GET https://logincert.anaf.ro/anaf-oauth2/v1/authorize`
- Token Exchange: `POST https://logincert.anaf.ro/anaf-oauth2/v1/token`
- Client requires qualified digital certificate (USB token or software cert)

### e-Factura Endpoints (Production)
- Upload B2B: `POST https://api.anaf.ro/prod/FCTEL/rest/upload?standard=UBL&cif={cif}`
- Upload B2C: `POST https://api.anaf.ro/prod/FCTEL/rest/uploadb2c?standard=UBL&cif={cif}`
- Check Status: `GET https://api.anaf.ro/prod/FCTEL/rest/stareMesaj?id_incarcare={id}`
- Download: `GET https://api.anaf.ro/prod/FCTEL/rest/descarcare?id={id_descarcare}`
- List Messages: `GET https://api.anaf.ro/prod/FCTEL/rest/listaMesajeFactura?zile={n}&cif={cif}`
- Validate: `POST https://api.anaf.ro/prod/FCTEL/rest/validare/UBL`
- XML to PDF: `POST https://api.anaf.ro/prod/FCTEL/rest/transformare/FACT1`

### e-Factura Endpoints (Test/Sandbox)
- Same paths but under `https://api.anaf.ro/test/FCTEL/rest/...`

### Company Lookup (Free, No Auth)
- `POST https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva`
- Body: `[{"cui": 12345678, "data": "2026-03-17"}]`
- Returns: company name, address, VAT status, registration number

### XML Format
- Standard: UBL 2.1 (Universal Business Language)
- National spec: RO_CIUS (Romanian Core Invoice Usage Specification)
- Namespace: `urn:oasis:names:specification:ubl:schema:xsd:Invoice-2`
- Validation artifacts: https://mfinante.gov.ro/web/efactura/informatii-tehnice

## Key Business Rules

### Invoice Lifecycle States
```
draft → generated → uploaded → pending → accepted → archived
                                      → rejected (user must fix and resubmit)
```

### Deadline Calculation
- Invoices must be submitted to ANAF within **5 working days** from issue date
- Working days exclude weekends and Romanian legal holidays
- Non-compliance: tiered fines + 15% penalty on invoice value

### Romanian Legal Holidays 2026
```python
HOLIDAYS_2026 = [
    "2026-01-01", "2026-01-02",   # Anul Nou
    "2026-01-24",                  # Unirea Principatelor
    "2026-04-10",                  # Vinerea Mare
    "2026-04-12", "2026-04-13",   # Pastele Ortodox
    "2026-05-01",                  # Ziua Muncii
    "2026-05-31", "2026-06-01",   # Rusalii
    "2026-08-15",                  # Adormirea Maicii Domnului
    "2026-11-30",                  # Sfantul Andrei
    "2026-12-01",                  # Ziua Nationala
    "2026-12-25", "2026-12-26",   # Craciun
]
```

### VAT Rates (Romania 2026)
- 19% — Standard rate (most goods and services)
- 9% — Reduced (food, water, medicines, hotel, restaurant)
- 5% — Reduced (books, newspapers, cultural events, social housing)
- 0% — Exempt (exports, intra-EU supplies, certain financial services)

### Common UBL Unit Codes
- H87 — Piece (bucată)
- HUR — Hour (oră)
- DAY — Day (zi)
- MON — Month (lună)
- KGM — Kilogram
- MTR — Meter
- LTR — Liter
- MTK — Square meter (mp)

## AI Chatbot System Prompt

The chatbot uses Claude Haiku for cost efficiency. Here is the system prompt:

```
Ești asistentul fiscal AI al FacturAI. Răspunzi DOAR la întrebări despre:
- e-Factura (RO e-Factura, SPV, XML, UBL)
- Obligații fiscale pentru PFA și SRL în România
- Erori ANAF (coduri BR-RO-XXX) și cum se rezolvă
- e-Transport
- Termene de raportare
- TVA, CAS, CASS, impozit pe venit

Reguli:
- Răspunde ÎNTOTDEAUNA în limba română
- Fii concis și practic — dă pași concreți, nu teorie
- Când explici o eroare BR-RO-XXX, specifică exact ce câmp trebuie corectat
- Nu da sfaturi juridice — recomandă consultarea unui contabil pentru situații complexe
- Dacă nu știi răspunsul, spune clar și sugerează să contacteze un contabil
- Folosește un ton prietenos dar profesional
```

## Development Workflow

### Getting Started (First Time Setup)

```bash
# 1. Clone the repository
git clone https://github.com/sabinbobu/facturai.git
cd facturai

# 2. Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate          # Linux/Mac
pip install -r requirements.txt
cp .env.example .env               # Fill in your keys

# 3. Frontend setup
cd ../frontend
npm install

# 4. Start local services (Redis for Celery)
cd ..
docker-compose up -d

# 5. Run backend
cd backend
uvicorn app.main:app --reload --port 8000

# 6. Run frontend (separate terminal)
cd frontend
npm run dev

# 7. Run Celery worker (separate terminal)
cd backend
celery -A app.tasks worker --loglevel=info

# 8. Run Celery Beat scheduler (separate terminal)
cd backend
celery -A app.tasks beat --loglevel=info
```

### Environment Variables (.env)

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_KEY=eyJhbGciOiJI...

# ANAF OAuth2
ANAF_CLIENT_ID=your_client_id
ANAF_CLIENT_SECRET=your_client_secret
ANAF_REDIRECT_URI=https://facturai.ro/api/auth/anaf/callback
ANAF_ENV=test  # 'test' or 'prod'

# Anthropic (for AI chatbot)
ANTHROPIC_API_KEY=sk-ant-...

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# Resend (for email notifications)
RESEND_API_KEY=re_...

# App
APP_URL=http://localhost:5173
API_URL=http://localhost:8000
SECRET_KEY=generate-a-random-secret-key
```

## Implementation Priority (Build Order)

### Phase 1: Foundation (Week 1 — Days 1-5)
1. Initialize Supabase project + run migration SQL
2. Scaffold FastAPI with health check + CORS
3. Scaffold React + Vite + TypeScript + shadcn/ui + Tailwind
4. Implement Supabase Auth (signup/login/logout)
5. Build organization CRUD (company profile setup)
6. Build CUI lookup service (ANAF public API — no auth needed)
7. Build client CRUD with CUI auto-fill

### Phase 2: Core Invoicing (Week 2 — Days 6-10)
1. Build invoice CRUD (create/edit/list/delete drafts)
2. Build invoice line items management
3. Build UBL 2.1 XML generator module (lxml)
4. Download ANAF validation artifacts (schematron files)
5. Build local XML validation against RO_CIUS
6. Build invoice form UI (multi-step wizard)
7. Build invoice list with status badges and filters

### Phase 3: ANAF Integration (Week 3 — Days 11-15)
1. Implement ANAF OAuth2 flow (connect, callback, token storage)
2. Implement invoice upload to ANAF (test environment first)
3. Implement status polling (stareMesaj endpoint)
4. Implement signed XML download (descarcare endpoint)
5. Set up Celery + Redis for background polling
6. Build status tracking UI with real-time updates
7. Implement PDF generation (ANAF XML-to-PDF API)

### Phase 4: AI Chatbot + Compliance (Week 4 — Days 16-20)
1. Build AI chatbot backend (Claude Haiku integration)
2. Build chat UI with quick-question buttons
3. Build deadline calculation engine (Romanian business days)
4. Build dashboard with stats, deadlines, risk indicators
5. Build archive management (Supabase Storage)
6. Implement email notifications (Resend) for deadline alerts
7. Error message translation: ANAF error codes → plain Romanian

### Phase 5: Polish + Launch (Week 5 — Days 21-25)
1. Switch to ANAF production environment
2. Build landing page with pricing
3. Implement Stripe subscription (free/pro/business/accountant tiers)
4. Final UI polish and responsive design
5. Deploy to Railway (EU region)
6. Set up custom domain (facturai.ro)
7. Set up Sentry + PostHog

## Coding Conventions

### Python (Backend)
- Use type hints everywhere
- Use async/await for all I/O operations (httpx, database calls)
- Use Pydantic v2 models for all request/response schemas
- Follow FastAPI dependency injection patterns
- Prefix all router paths with `/api/`
- Use `logging` module, not `print()`

### TypeScript (Frontend)
- Strict mode enabled
- Use functional components with hooks only
- Use React Query for all API calls (no raw fetch in components)
- Use Zod for form validation schemas
- Use the `cn()` utility from shadcn for conditional class names
- Keep components small — extract to separate files at 100+ lines

### General
- Commit messages: conventional commits (feat:, fix:, docs:, refactor:)
- Branch strategy: main + feature branches (feat/invoice-crud, feat/anaf-oauth)
- No console.log in production code
- All user-facing text in Romanian (except code comments which are in English)

## Key Resources

- ANAF e-Factura technical docs: https://mfinante.gov.ro/web/efactura/informatii-tehnice
- ANAF API presentation PDF: https://mfinante.gov.ro/static/10/eFactura/prezentare%20api%20efactura.pdf
- ANAF online XML validator: https://www.anaf.ro/uploadxmi/
- ANAF XML-to-PDF converter: https://www.anaf.ro/uploadxml
- TypeScript SDK reference: https://github.com/florin-szilagyi/efactura-anaf-ts-sdk
- UBL 2.1 Invoice schema: http://docs.oasis-open.org/ubl/os-UBL-2.1/UBL-2.1.html
- RO_CIUS validation artifacts: download from mfinante.gov.ro/web/efactura/informatii-tehnice
- Supabase docs: https://supabase.com/docs
- FastAPI docs: https://fastapi.tiangolo.com
- shadcn/ui: https://ui.shadcn.com
- Anthropic Claude API: https://docs.anthropic.com/en/api
