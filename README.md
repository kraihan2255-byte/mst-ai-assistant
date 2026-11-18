# MST Tengapal Business Assistant

AI-powered business management platform for **MST Tengapal**, a premium coconut milk supplier based in Malappuram district, Kerala, India.

The solution pairs an on-device local LLM (**Ollama + Qwen3 4B**) with a deterministic **NestJS + PostgreSQL (Prisma ORM)** backend and a modern **React 19 + TypeScript (Vite + Tailwind CSS)** frontend.

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                 Private Remote Access (Tailscale)           │
│   • Tailscale Serve: Private Encrypted HTTPS                │
│   • Accessible strictly from authorized iPhone & Mac       │
│   • https://<mac-mini-hostname>.<tailnet>.ts.net            │
└──────────────────────────────┬──────────────────────────────┘
                               │ Private TLS (Zero Internet Exposure)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Caddy Production Web Server (Port 8080)     │
│   • Serves compiled React 19 SPA (frontend/dist)            │
│   • SPA history routing fallback to /index.html             │
│   • Reverse proxy: /api/* -> NestJS on 127.0.0.1:3000       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Local loopback
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 NestJS Production Backend (Port 3000)       │
│   • Argon2id Password Hashing & HTTP-only Session Cookies   │
│   • Login Rate Limiting & Global AuthGuard                  │
│   • Strict Separation of Concerns: LLM parses, DB calculates│
│   • Integer Paise Math & Multi-Item Atomic Transactions     │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   PostgreSQL 17 (Homebrew)   │ │      Local Ollama Engine   │
│ • Preserved live production  │ │ • Model: qwen3:4b (2.5 GB) │
│ • Automated verified backups │ │ • 100% On-Device Inference │
│ • Port 5432 (Local loopback) │ │ • Port 11434 (Loopback)    │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## Key Highlights & Architectural Guardrails

- **Strict Separation of Concerns**: The local LLM is exclusively used to parse and extract structured information from natural language messages. It is **never** permitted to calculate balances, determine payment statuses, or alter financial states.
- **Deterministic Business & Financial Logic**: All financial transactions, balance calculations (`total_amount - total_received`), payment status classifications (`UNPAID`, `PARTIALLY_PAID`, `PAID`), and input sanity checks (rejecting negative quantities/amounts or payments exceeding totals) are executed deterministically on the backend.
- **Integer Paise Storage**: All monetary values are stored as integers in **paise** (`₹1 = 100 paise`), preventing floating-point calculation errors.
- **Outer Box vs Product Pack Separation**: Outer box count is kept separate from individual product pack counts (500g, 1kg) without assuming an arbitrary conversion ratio.
- **Independent Product Pricing & Price Preservation**: Product prices are managed independently per size in `ProductPriceHistory` with `effectiveFrom` timestamps. Historical delivery records retain the unit price applied at the time of delivery even if catalog prices change in the future.
- **Idempotency Protection**: Delivery confirmations accept an optional `idempotencyKey` to guard against duplicate submissions on network retries.
- **Atomic Database Transactions**: All delivery records, line items, and payments are committed together inside `prisma.$transaction`.
- **Zero Cloud AI Dependency**: Operates 100% locally with zero external API calls (no OpenAI, Gemini, Anthropic, or LangChain).

---

## Directory Structure

```text
mst-ai-assistant/
├── docker-compose.yml                       # Docker Compose for local PostgreSQL
├── backend/                                 # NestJS + Prisma Backend
│   ├── prisma/
│   │   ├── schema.prisma                    # Prisma schema: Customer, Area, Product, ProductPriceHistory, Delivery, DeliveryItem, Payment
│   │   ├── migrations/                      # Applied Prisma migrations
│   │   └── seed.ts                          # Seed script (Malappuram sample areas, coconut milk products)
│   ├── src/
│   │   ├── main.ts                          # Bootstrap, /api prefix, CORS, validation pipe, exception filter
│   │   ├── app.module.ts                    # Root module
│   │   ├── config/configuration.ts          # Environment configuration
│   │   ├── prisma/                          # Prisma service & client lifecycle
│   │   ├── customers/                       # Customer CRUD, Malappuram areas, balance calculation
│   │   ├── products/                        # Product catalog & effective date price history
│   │   ├── deliveries/                      # Itemized/bulk delivery confirmation & payment recording
│   │   ├── reports/                         # Summary, outstanding credit & collections analytics
│   │   ├── ai/                              # Ollama Qwen3 client & customer matching preview
│   │   └── health/                          # Backend & Ollama health check
│   ├── test/                                # Integration & E2E test suites
│   ├── package.json
│   └── tsconfig.json
├── frontend/                                # React 19 + TypeScript Frontend
│   ├── src/
│   │   ├── app/                             # App layout, providers, React Router setup
│   │   ├── components/
│   │   │   ├── ui/                          # Button, Input, Select, Textarea, Badge, Card, Modal, Toast
│   │   │   ├── common/                      # StatCard, EmptyState, ErrorBanner, LoadingSpinner
│   │   │   └── layout/                      # Sidebar, Header, MobileNav, AppLayout
│   │   ├── features/
│   │   │   ├── assistant/                   # Conversational AI assistant & delivery draft preview
│   │   │   ├── dashboard/                   # Business KPIs, revenue overview & collections chart
│   │   │   ├── customers/                   # Customer list, filters, customer profile & credit balances
│   │   │   ├── deliveries/                  # Delivery ledger, itemized details & payment status
│   │   │   ├── payments/                    # Payment collections ledger & payment recording modal
│   │   │   ├── products/                    # Packaging sizes, unit rates & price history modal
│   │   │   ├── reports/                     # Business reports, outstanding debts & payment methods
│   │   │   └── settings/                    # Ollama status diagnostic & connection verification
│   │   ├── lib/                             # Axios API client, TanStack Query, Indian Rupee formatters
│   │   ├── types/                           # Strongly typed API DTOs and database models
│   │   └── test/                            # Vitest unit and component tests
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

---

## Quick Start: Running the Full Stack Locally

### 1. Start Local PostgreSQL Database
```bash
# Using Docker:
docker compose up -d

# Or ensure native PostgreSQL is running on port 5432:
createdb mst_tengapal
createdb mst_tengapal_test
```

### 2. Verify Local Ollama Runtime
Make sure Ollama is running and has the `qwen3:4b` model installed:
```bash
ollama list
# Should display qwen3:4b
```

### 3. Start NestJS Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run start:dev
```
Backend API will be running at `http://localhost:3000/api`.

### 4. Start React Frontend
In a new terminal window:
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Frontend application will be accessible at [http://localhost:5173](http://localhost:5173).

---

## Verification & Test Results

Both backend and frontend are covered with automated test suites ensuring business correctness:

### Backend Test Suites:
- Unit & Persistence Tests: `52 / 52 passing` (`cd backend && npm test`)
- End-to-End Tests: `31 / 31 passing` (`cd backend && npm run test:e2e`)
  - `auth.e2e-spec.ts`: Login validation, HTTP-only session cookies, rate-limit protection, session verification, logout
  - `deliveries.e2e-spec.ts`: Live Ollama Qwen3 4B natural language command extraction & validation
  - `phase2-persistence.e2e-spec.ts`: Unauthenticated 401 rejection, customer CRUD, independent pricing, atomic deliveries, idempotency, payments, and financial reports
- Linting: `0 errors, 0 warnings` (`cd backend && npm run lint`)
- Build: Successful TypeScript compilation (`cd backend && npm run build`)

### Frontend Test Suites:
- Component & Logic Tests: `20 / 20 passing` (`cd frontend && npm test`)
  - `login-page.spec.tsx`: Form rendering, input validation, authentication dispatch, and error banners
  - `assistant-chat.spec.tsx`: Natural language flow, missing fields prompt, draft preview & error handling
  - `delivery-preview.spec.tsx`: Line-item breakdown, bulk delivery, financial totals & confirmation
  - `customer-selection.spec.tsx`: Ambiguous customer resolution picker
  - `record-payment-modal.spec.tsx`: Payment submission, duplicate click prevention & balance cap rejection
  - `formatters.spec.ts`: Currency formatting, paise conversion & status styles
- Linting: `0 errors, 0 warnings` (`cd frontend && npm run lint`)
- Build: Successful Vite production bundle (`cd frontend && npm run build`)

---

## Production Operational Scripts

| Script | Purpose | Description |
| :--- | :--- | :--- |
| `scripts/start.sh` | **Start Services** | Starts background NestJS production backend and Caddy web server |
| `scripts/stop.sh` | **Stop Services** | Gracefully terminates Caddy and backend processes |
| `scripts/deploy.sh` | **Deploy Pipeline** | Automated backup -> migrations -> backend build -> frontend build -> service restart -> health check |
| `scripts/health-check.sh` | **Diagnostics** | Real-time probe of PostgreSQL (5432), Ollama (11434), Qwen3 4B, Backend API (3000), Caddy (8080), and Tailscale |
| `scripts/backup-db.sh` | **Automated Backup** | Creates compressed, timestamped `pg_dump` archive with 14-day retention and integrity verification |
| `scripts/restore-db.sh` | **Restore Verification** | Restores any backup archive safely into `mst_tengapal_test` without endangering production |
| `scripts/update.sh` | **System Update** | Pulls git updates, installs dependencies, and runs deployment pipeline |

   cp .env.example .env
   ```

   `.env`:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mst_tengapal?schema=public"
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=qwen3:4b
   OLLAMA_TIMEOUT_MS=30000
   ```

2. **Run Migrations**:
   ```bash
   npx prisma migrate dev
   ```

3. **Seed Database**:
   Seeds areas, initial products ("Coconut Milk 500g" at ₹155, "Coconut Milk 1kg" at ₹290), and sample customers.
   ```bash
   npx prisma db seed
   ```

---

## Running the Application

```bash
# Development mode
npm run start:dev

# Production build and run
npm run build
npm run start:prod
```

The server listens on `http://localhost:3000/api`.

---

## Running Tests

### 1. Unit & Database Integration Tests
Runs all 40 tests across AI parsing, deterministic business rules, customer management, pricing histories, and transaction persistence:
```bash
npm test
```

### 2. End-to-End Tests (with Live Ollama & Database)
Runs all 22 E2E tests:
```bash
npm run test:e2e
```

### 3. Code Linter & Formatter
```bash
npm run lint
npm run format
```

---

## API Reference & cURL Examples

### 1. Health Probe
```bash
curl -s http://localhost:3000/api/health | jq .
```

### 2. AI Parsing & Database Customer Matching
Extracts delivery intent and matches customer against the database:
```bash
curl -s -X POST http://localhost:3000/api/ai/parse-command \
  -H "Content-Type: application/json" \
  -d '{"message": "I delivered 10 boxes to ABC Catering for 5000 rupees and received 2000 through GPay."}' | jq .
```

**Response**:
```json
{
  "action": "record_delivery",
  "recipient_name": "ABC Catering",
  "boxes_delivered": 10,
  "total_amount": 5000,
  "payments": [
    {
      "amount": 2000,
      "method": "UPI",
      "provider": "GPay"
    }
  ],
  "matched_customer": {
    "id": "eb6485e2-82f7-4beb-8e47-6c816c1a9d59",
    "name": "ABC Catering",
    "phone": "9876543210",
    "area": "Gandhipuram"
  },
  "requires_customer_selection": false,
  "candidate_customers": [
    {
      "id": "eb6485e2-82f7-4beb-8e47-6c816c1a9d59",
      "name": "ABC Catering",
      "phone": "9876543210",
      "area": "Gandhipuram"
    }
  ],
  "confirmation_preview": {
    "customerId": "eb6485e2-82f7-4beb-8e47-6c816c1a9d59",
    "customerName": "ABC Catering",
    "outerBoxes": 10,
    "totalAmountRupees": 5000,
    "payments": [
      {
        "amount": 2000,
        "method": "UPI",
        "provider": "GPay"
      }
    ],
    "ready_to_confirm": true
  }
}
```

### 3. Confirm and Persist Delivery
Commits delivery, line items, and initial payments in a single transaction:
```bash
curl -s -X POST http://localhost:3000/api/deliveries/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "eb6485e2-82f7-4beb-8e47-6c816c1a9d59",
    "outerBoxes": 10,
    "totalAmountRupees": 5000,
    "payments": [
      {
        "amountRupees": 2000,
        "method": "UPI",
        "provider": "GPay"
      }
    ],
    "idempotencyKey": "confirm-demo-1",
    "confirmed": true
  }' | jq .
```

### 4. Record Additional Payment
Settles outstanding balance against an existing delivery:
```bash
curl -s -X POST http://localhost:3000/api/deliveries/:id/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amountRupees": 3000,
    "method": "CASH"
  }' | jq .
```

### 5. Check Customer Outstanding Balance
Calculates customer balance from persisted transactions:
```bash
curl -s http://localhost:3000/api/customers/:id/balance | jq .
```
```json
{
  "customerId": "eb6485e2-82f7-4beb-8e47-6c816c1a9d59",
  "customerName": "ABC Catering",
  "phone": "9876543210",
  "totalDeliveries": 1,
  "totalBilledRupees": 5000,
  "totalPaidRupees": 5000,
  "outstandingRupees": 0,
  "paymentStatus": "PAID"
}
```

### 6. Financial Reporting APIs
```bash
# Business summary
curl -s http://localhost:3000/api/reports/summary | jq .

# Outstanding credit by customer
curl -s http://localhost:3000/api/reports/outstanding | jq .

# Payment collections breakdown
curl -s http://localhost:3000/api/reports/payments | jq .
```
