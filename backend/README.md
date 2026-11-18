# MST Tengapal Business Assistant — Phase 2 Backend

Local AI-powered business management backend for **MST Tengapal**, a coconut milk business.

Phase 2 introduces a reliable **PostgreSQL** database and **Prisma ORM** persistence layer for customers, products, price histories, deliveries, delivery items, and payments, integrated with the existing local **Ollama (Qwen3:4b)** AI assistant.

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
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma                    # Prisma schema: Customer, Area, Product, ProductPriceHistory, Delivery, DeliveryItem, Payment
│   │   ├── migrations/                      # Applied Prisma migrations
│   │   └── seed.ts                          # Seed script for initial areas, products (500g: ₹155, 1kg: ₹290), and customers
│   ├── src/
│   │   ├── main.ts                          # Bootstrap, global prefix /api, validation pipe, exception filter
│   │   ├── app.module.ts                    # Root module
│   │   ├── config/
│   │   │   └── configuration.ts             # Configuration loader (PORT, DATABASE_URL, OLLAMA_*)
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts             # Global Prisma module
│   │   │   └── prisma.service.ts            # Prisma client lifecycle management
│   │   ├── customers/
│   │   │   ├── customers.module.ts
│   │   │   ├── customers.controller.ts      # POST /api/customers, GET /api/customers, GET /api/customers/:id/balance
│   │   │   ├── customers.service.ts         # Customer search, matching & balance calculation from transactions
│   │   │   └── customers.service.spec.ts    # Customer integration tests (5 tests)
│   │   ├── products/
│   │   │   ├── products.module.ts
│   │   │   ├── products.controller.ts       # GET/POST /api/products, GET/POST /api/products/:id/prices
│   │   │   ├── products.service.ts          # Product catalog, effective price lookup & price history
│   │   │   └── products.service.spec.ts     # Product & pricing tests (3 tests)
│   │   ├── deliveries/
│   │   │   ├── deliveries.module.ts
│   │   │   ├── deliveries.controller.ts     # POST /api/deliveries/confirm, GET /api/deliveries, POST /api/deliveries/:id/payments
│   │   │   ├── deliveries.service.ts        # Phase 1 validation + Phase 2 atomic confirmation & payments
│   │   │   ├── deliveries.service.spec.ts   # Phase 1 deterministic validation tests (12 tests)
│   │   │   └── deliveries-persistence.spec.ts # Phase 2 persistence, concurrency, itemization & guardrail tests (15 tests)
│   │   ├── reports/
│   │   │   ├── reports.module.ts
│   │   │   ├── reports.controller.ts        # GET /api/reports/summary, outstanding, deliveries, payments
│   │   │   └── reports.service.ts           # Aggregated financial analytics & collections reports
│   │   ├── ai/
│   │   │   ├── ai.module.ts
│   │   │   ├── ai.controller.ts             # POST /api/ai/parse-command & validate-delivery
│   │   │   ├── ai.service.ts                # Ollama Qwen3 client + DB customer matching & preview
│   │   │   └── ai.service.spec.ts           # Ollama client mock tests (11 tests)
│   │   └── health/
│   │       ├── health.module.ts
│   │       └── health.controller.ts         # GET /api/health
│   ├── test/
│   │   ├── deliveries.e2e-spec.ts           # Phase 1 E2E tests with live Ollama
│   │   └── phase2-persistence.e2e-spec.ts   # Phase 2 E2E tests for customers, deliveries & reports
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Database Setup

### Option A: Using Docker Compose
Start local PostgreSQL in Docker:
```bash
docker compose up -d
```

### Option B: Using Native PostgreSQL
Ensure PostgreSQL is running locally on port 5432:
```bash
createdb mst_tengapal
createdb mst_tengapal_test
```

---

## Configuration & Migrations

1. **Environment Variables**:
   ```bash
   cd backend
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
