# How to Test the App in the Browser

This guide walks through running the Preemptly app locally and testing it in a browser.

## Prerequisites

- **Node.js** >= 18
- **Bun** (required for the Elysia API)
- **PostgreSQL** — either a [Neon](https://neon.tech) account or a local Postgres instance

## 1. Install Dependencies

From the repo root:

```bash
npm install
```

## 2. Set Up Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

**Minimum required variables:**

```env
DATABASE_URL="postgresql://user:password@host/preemptly?sslmode=require"
JWT_SECRET="any-secret-string-for-local-dev"
```

Optional (needed for full functionality):

```env
JWT_EXPIRES_IN="30d"
OTP_SERVICE_API_KEY="your-semaphore-api-key"   # SMS OTP (Philippine gateway)
WEB_URL="http://localhost:3001"                 # CORS origin
```

> The `.env` file must be at the **repo root** — both apps and Prisma reference it from there.

## 3. Set Up the Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate

# Seed test data (optional but recommended)
npm run db:seed
```

The seed script creates:
- **Test user:** `+639170000001` (Juan Dela Cruz)
- **Test retailer:** `+639170000002` (Gas Express Makati, invite code `GASEXP01`)
- A location, 11kg tank, estimation, and customer-retailer link

## 4. Start the Servers

Open **two terminals** from the repo root:

**Terminal 1 — API (Elysia):**
```bash
npm run api-elysia:dev
```
Runs on `http://localhost:3000/api`

**Terminal 2 — Web dashboard (Next.js):**
```bash
npm run web:dev
```
Runs on `http://localhost:3001`

## 5. Open in Browser

Go to: **http://localhost:3001**

You'll be redirected to `/login` (the retailer login page).

## 6. Authentication Flow

The web app is a **retailer dashboard**. Authentication uses phone-based OTP:

### Option A: Register a New Retailer

1. Go to `http://localhost:3001/register`
2. Fill in: Business Name, Owner Name, Phone, Address, City
3. Click **Register** — this calls `POST /api/retailers/register`
4. You'll be redirected to `/login`

### Option B: Use the Seeded Retailer

If you ran `npm run db:seed`, use phone `+639170000002`.

### Login Steps

1. At `/login`, enter the retailer phone number (e.g. `+639170000002`)
2. Click **Send OTP** — this calls `POST /api/auth/send-otp`
3. The OTP code is **logged to the API terminal** (not sent via real SMS in dev mode):
   ```
   [OTP] Sending code 847291 to +639170000002
   ```
4. Copy the 6-digit code from the terminal output
5. Enter it in the OTP field and click **Verify & Sign In**
6. This calls `POST /api/auth/retailer/verify-otp` → returns a JWT → stored in `localStorage` as `retailer_token`
7. You're redirected to `/dashboard`

## 7. Dashboard Pages

Once authenticated, you can navigate these pages:

| Page | URL | What It Shows |
|------|-----|---------------|
| Dashboard | `/dashboard` | Customer count, pending orders, running low count |
| Customers | `/dashboard/customers` | Linked customers with gas status |
| Orders | `/dashboard/orders` | Order list with status management |
| Invite | `/dashboard/invite` | Invite link/code + click/join stats |
| Settings | `/dashboard/settings` | Pricing, preemptly zone, discount tiers |

## 8. Testing API Endpoints Directly

You can also test the API without the web dashboard using `curl` or any HTTP client.

### Get a JWT token

```bash
# 1. Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+639170000002"}'

# 2. Check the API terminal for the OTP code, then verify
curl -X POST http://localhost:3000/api/auth/retailer/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+639170000002", "code": "THE_CODE"}'
```

The response includes `accessToken`. Use it in subsequent requests:

```bash
curl http://localhost:3000/api/retailers/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Health check (no auth needed)

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","timestamp":"..."}
```

## 9. Prisma Studio (Database GUI)

To browse/edit database records directly:

```bash
npm run db:studio
```

Opens a web UI (usually at `http://localhost:5555`) where you can view and edit all tables.

## 10. Running Tests

```bash
cd apps/api-elysia && bun test
```

113 tests across all 12 API modules + estimation engine (runs in ~500ms, no database needed).

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `PrismaClientInitializationError` | Check `DATABASE_URL` in `.env` at the repo root |
| CORS errors in browser | Make sure `WEB_URL=http://localhost:3001` is in `.env` |
| Login fails with "No retailer account found" | Register first at `/register`, or run `npm run db:seed` |
| Can't find OTP code | Look at the **API terminal** output for `[OTP] Sending code ...` |
| Port 3000 already in use | Kill the other process, or only run **one** API (NestJS or Elysia, not both) |
| `retailer_token` stale | Open DevTools → Application → Local Storage → clear `retailer_token` |

## Architecture Notes

- The project has **two API implementations**: `apps/api` (NestJS) and `apps/api-elysia` (Elysia/Bun). Only run one at a time — both use port 3000. The Elysia version is the active one.
- The web app is a **retailer-only dashboard**. Consumer features are in the Flutter mobile app (`apps/mobile`), which is a separate project.
- In dev mode, OTP codes are printed to the console instead of sent via SMS. No real SMS gateway is needed for local testing.
