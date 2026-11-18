# MST Tengapal Business Assistant — Frontend

Production-ready React 19 + TypeScript web application for **MST Tengapal**, a premium coconut milk supplier.

The frontend connects directly to the NestJS + PostgreSQL backend and provides a fast, responsive interface for recording deliveries, tracking customer credit, scheduling product price changes, analyzing financial collections, and interacting with the on-device local Ollama AI assistant.

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Dev Server**: Vite 6
- **Styling**: Tailwind CSS with custom MST Tengapal Coconut Milk palette
- **Icons**: Lucide React
- **Server State & Caching**: TanStack Query (React Query v5)
- **Routing**: React Router v7
- **Forms & Validation**: React Hook Form + Zod
- **Data Visualization**: Recharts
- **Testing**: Vitest + React Testing Library + JSDOM
- **Linting**: Oxlint

---

## Brand Palette & Design Tokens

| Token | Hex | Role |
| :--- | :--- | :--- |
| `brand-primary` | `#107B6C` | Deep Coconut Leaf Green — Primary actions, active navigation |
| `brand-primary-hover` | `#0D6357` | Darkened teal for button hover states |
| `brand-secondary` | `#8AC5AB` | Pale Mint — Secondary highlights, borders, status tags |
| `brand-accent` | `#D6F3EE` | Light Aqua Mist — Active item backgrounds, pill badges |
| `brand-dark` | `#0F5F54` | Dark Teal — Headings, prominent titles, emphasized data |
| `brand-surface` | `#F8F7F2` | Warm Coconut Cream — Application workspace background |

Typography is set to **Plus Jakarta Sans** with clean numerical tabular figures for financial data.

---

## Feature Modules & Routes

| Route | Feature | Highlights |
| :--- | :--- | :--- |
| `/assistant` | **AI Assistant** | Natural-language chat powered by local Qwen3 4B; interactive delivery draft cards; line-item and bulk non-itemized modes; customer disambiguation; one-click confirmation |
| `/` | **Dashboard** | Real-time business KPIs (Revenue, Collected, Outstanding, Deliveries, Active Customers); payment method distribution chart; recent delivery ledger; top outstanding credit debtors |
| `/customers` | **Customer Directory** | Search by business name, phone, or area; area filter pills; outstanding balance badges; create/edit customer profiles |
| `/customers/:id` | **Customer Profile** | Customer details, balance breakdown, delivery ledger, inline payment recording |
| `/deliveries` | **Deliveries Ledger** | Searchable delivery list, filter by status (`UNPAID`, `PARTIALLY_PAID`, `PAID`); itemized pack breakdown vs bulk delivery indicator; outer boxes; payment history modal |
| `/payments` | **Payments Ledger** | Chronological record of all cash, UPI, bank transfer, and cheque receipts; filter by payment method |
| `/products` | **Products & Pricing** | Active catalog (500g, 1kg, 250g); current unit rates in ₹ and paise; scheduled price updates with `effectiveFrom`; complete price audit history modal |
| `/reports` | **Financial Analytics** | Aggregated financial summary; customer-wise outstanding aging table; delivery history log; payment method breakdown; date range filtering |
| `/settings` | **System & Diagnostics** | Real-time Ollama local AI runtime status (`http://localhost:11434`); NestJS backend health check; configuration overview; offline privacy notice |

---

## Getting Started

### 1. Prerequisites

- **Node.js**: v20+ (v22 recommended)
- **Backend Service**: Ensure the MST Tengapal NestJS backend is running on `http://localhost:3000`
- **Local AI Runtime**: Ensure Ollama is running with `qwen3:4b` (`ollama run qwen3:4b`)

### 2. Environment Variables

Create a `.env` file in the `frontend/` directory (optional in local dev as the Vite proxy forwards `/api` automatically):

```env
# Optional: defaults to /api which proxies to http://localhost:3000
VITE_API_BASE_URL=/api
```

### 3. Installation & Local Development

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server on `http://localhost:5173` with HMR |
| `npm run build` | Runs TypeScript type checking (`tsc -b`) and bundles production assets with Vite |
| `npm test` | Runs the full Vitest component and logic test suite |
| `npm run test:watch` | Starts Vitest in interactive watch mode |
| `npm run lint` | Runs lightning-fast Oxlint across all TypeScript and TSX files |
| `npm run preview` | Previews the production build locally |

---

## Architectural Guardrails & Financial Safety

1. **Deterministic Financial Math**:
   - The UI never relies on LLM calculations for totals, balances, or payment states.
   - Calculations use integer paise under the hood (`formatPaise`) and display whole rupees cleanly (`formatRupees`).
2. **Payment Capping**:
   - The `RecordPaymentModal` strictly forbids recording payments greater than a delivery's remaining dues.
3. **Outer Box Independence**:
   - Outer boxes delivered are recorded and tracked as separate physical logistics units from individual pack counts (500g, 1kg), with zero assumed conversion ratio.
4. **Historical Price Invariance**:
   - Historical delivery unit prices are immutable. Future catalog price updates do not retroactively alter settled or pending deliveries.
5. **Idempotency Protection**:
   - All delivery confirmations generate a unique `idempotencyKey` to prevent double-charging or duplicate order creation on network retries.
