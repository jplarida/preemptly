# PreEmptly — Elysia (Bun) API Migration Technical Document

**Created:** 2026-03-01
**Aligned with:** `preemptly2.md`, `IMPLEMENTATION_PLAN_v2.md`
**Status:** Approved for implementation

---

## Context

PreEmptly's NestJS API (`apps/api`) has 10 modules and ~60 files, but the revised process flow (`preemptly2.md`) requires major rework — new rider role, discount system, QR codes, expanded order states, SMS fallback, and more. Since most of the API needs rebuilding anyway, we're replacing the framework with Elysia on Bun for better performance and simpler architecture. The new API will be built in `apps/api-elysia` with preemptly2.md features included from the start.

---

## Why Elysia over NestJS

| Factor | NestJS (current) | Elysia (new) |
|--------|-----------------|--------------|
| Runtime | Node.js | Bun (faster startup, lower memory) |
| Raw throughput | ~30K req/s | ~300K+ req/s |
| Cold start | ~2-3s | ~100ms |
| Dependency count | ~25 packages | ~8 packages |
| DI complexity | Heavy (decorators, reflection, metadata) | None (direct imports) |
| Validation | class-validator (runtime decorators) | TypeBox (compile-time type inference) |
| Type safety | Manual DTOs | End-to-end via Eden treaty |
| Bundle size | Large (NestJS + Passport + class-validator + rxjs) | Minimal |

---

## Directory Structure

```
apps/api-elysia/
  package.json
  tsconfig.json
  src/
    index.ts                          # App entry: Elysia + CORS + error handler + compose all modules
    lib/
      prisma.ts                       # PrismaClient singleton
      errors.ts                       # HttpError class
      auth.ts                         # JWT plugin + auth derive middleware
      otp-sender.ts                   # OtpSender interface + ConsoleOtpSender
    modules/
      health/
        index.ts                      # GET /health
      auth/
        index.ts                      # Routes (send-otp, verify-otp, retailer/verify-otp, rider/verify-otp)
        service.ts                    # OTP + JWT logic
        model.ts                      # TypeBox schemas
      users/
        index.ts, service.ts, model.ts
      locations/
        index.ts, service.ts, model.ts
      tanks/
        index.ts, service.ts, model.ts
      estimation/
        engine.ts                     # Direct copy from NestJS (pure TS, remove @Injectable)
        engine.test.ts                # Direct copy of spec (works with bun test)
        service.ts                    # DB integration
        scheduler.ts                  # @elysiajs/cron daily alerts
      refills/
        index.ts, service.ts, model.ts
      orders/
        index.ts, service.ts, model.ts  # Expanded: 8 internal states, role-segregated views
      retailers/
        index.ts, service.ts, model.ts  # Expanded: pricing, discount tiers, preemptly zone config
      riders/                           # NEW
        index.ts, service.ts, model.ts  # Prospects, deliveries, customer reg, acknowledgement
      linking/
        index.ts, service.ts, model.ts  # Multi-retailer support
      notifications/
        index.ts, service.ts, model.ts
      discounts/                        # NEW
        index.ts, service.ts, model.ts  # Discount calculation, tier management
```

---

## NestJS-to-Elysia Concept Mapping

| NestJS Concept | Elysia Equivalent |
|----------------|-------------------|
| `@Module()` + DI container | `new Elysia({ prefix, name })` plugin |
| `@Controller()` | Route definitions in plugin `index.ts` |
| `@Injectable()` service | Static/abstract class or plain functions |
| `@UseGuards(JwtAuthGuard)` | `.use(authMiddleware)` |
| `@CurrentUser()` decorator | `currentUser` from `.derive()` context |
| `@CurrentRetailer()` decorator | `currentUser.retailer` from `.derive()` context |
| `@Body()` + class-validator DTO | `{ body: t.Object({...}) }` in route options |
| `@Param('id')` | `params.id` destructured from context |
| `@Query('status')` | `query.status` destructured from context |
| `ValidationPipe` (global) | Built-in TypeBox validation (automatic) |
| `ExceptionFilter` (global) | `.onError()` lifecycle hook |
| `@Cron(expression)` | `@elysiajs/cron` plugin |
| `PrismaService` (DI injected) | `prisma` singleton import |
| `ConfigService` | `process.env` or `Bun.env` directly |
| `passport-jwt` strategy | `@elysiajs/jwt` + `.derive()` |
| NestJS exception classes | `throw new HttpError(status, message)` |

### Exception Mapping

| NestJS | Elysia |
|--------|--------|
| `throw new BadRequestException('msg')` | `throw new HttpError(400, 'msg')` |
| `throw new UnauthorizedException('msg')` | `throw new HttpError(401, 'msg')` |
| `throw new ForbiddenException('msg')` | `throw new HttpError(403, 'msg')` |
| `throw new NotFoundException('msg')` | `throw new HttpError(404, 'msg')` |
| `throw new ConflictException('msg')` | `throw new HttpError(409, 'msg')` |

### DTO-to-TypeBox Mapping

| class-validator | TypeBox |
|----------------|---------|
| `@IsString()` | `t.String()` |
| `@IsNumber()` | `t.Number()` |
| `@IsBoolean()` | `t.Boolean()` |
| `@IsOptional()` | `t.Optional(...)` |
| `@IsEnum(MyEnum)` | `t.Union([t.Literal('A'), t.Literal('B')])` |
| `@IsArray()` | `t.Array(...)` |
| `@MinLength(n)` | `t.String({ minLength: n })` |
| `@Min(n)` / `@Max(n)` | `t.Number({ minimum: n, maximum: n })` |

---

## Core Infrastructure Patterns

### Prisma Singleton

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient()
```

No wrapper class. No DI lifecycle. Direct import everywhere.

### Error Handling

```typescript
// src/lib/errors.ts
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
```

```typescript
// In src/index.ts — global error handler
.error({ HttpError })
.onError(({ code, error, set }) => {
  if (code === 'HttpError') {
    set.status = error.status
    return { statusCode: error.status, message: error.message, timestamp: new Date().toISOString() }
  }
  if (code === 'VALIDATION') {
    set.status = 400
    return { statusCode: 400, message: error.message, timestamp: new Date().toISOString() }
  }
  set.status = 500
  return { statusCode: 500, message: 'Internal server error', timestamp: new Date().toISOString() }
})
```

Response format matches current NestJS output: `{ statusCode, message, timestamp }`.

### JWT Auth Middleware

```typescript
// src/lib/auth.ts
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { prisma } from './prisma'
import { HttpError } from './errors'

export const jwtPlugin = new Elysia({ name: 'jwt' })
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'dev-secret',
    exp: process.env.JWT_EXPIRES_IN || '30d',
  }))

export const authMiddleware = new Elysia({ name: 'auth' })
  .use(jwtPlugin)
  .derive(async ({ jwt, headers }) => {
    const auth = headers.authorization
    if (!auth?.startsWith('Bearer ')) throw new HttpError(401, 'Missing authorization')

    const payload = await jwt.verify(auth.slice(7))
    if (!payload) throw new HttpError(401, 'Invalid or expired token')

    if (payload.role === 'retailer') {
      const retailer = await prisma.retailer.findUnique({ where: { id: payload.sub as string } })
      if (!retailer) throw new HttpError(401, 'Retailer not found')
      return { currentUser: { id: retailer.id, phone: retailer.phone, role: 'retailer' as const, retailer } }
    }

    if (payload.role === 'rider') {
      const rider = await prisma.rider.findUnique({ where: { id: payload.sub as string } })
      if (!rider) throw new HttpError(401, 'Rider not found')
      return { currentUser: { id: rider.id, phone: rider.phone, role: 'rider' as const, rider } }
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub as string } })
    if (!user) throw new HttpError(401, 'User not found')
    return { currentUser: { id: user.id, phone: user.phone, role: 'user' as const } }
  })
```

### OTP Sender (Pluggable)

```typescript
// src/lib/otp-sender.ts
export interface OtpSender {
  send(phone: string, code: string): Promise<void>
}

export class ConsoleOtpSender implements OtpSender {
  async send(phone: string, code: string) {
    console.log(`[DEV OTP] ${phone}: ${code}`)
  }
}

export const otpSender: OtpSender =
  process.env.OTP_PROVIDER === 'semaphore'
    ? new SemaphoreOtpSender() // future
    : new ConsoleOtpSender()
```

### Route Module Pattern

```typescript
// src/modules/tanks/index.ts
import { Elysia } from 'elysia'
import { authMiddleware } from '../../lib/auth'
import { TanksService } from './service'
import { CreateTankBody, UpdateTankBody, AdjustTankBody } from './model'

export const tanksRoutes = new Elysia({ prefix: '/tanks' })
  .use(authMiddleware)
  .post('/', ({ body, currentUser }) => TanksService.create(currentUser.id, body), { body: CreateTankBody })
  .get('/', ({ currentUser }) => TanksService.findAllByUser(currentUser.id))
  .get('/:id', ({ params: { id }, currentUser }) => TanksService.findOne(id, currentUser.id))
  .patch('/:id', ({ params: { id }, currentUser, body }) => TanksService.update(id, currentUser.id, body), { body: UpdateTankBody })
  .delete('/:id', ({ params: { id }, currentUser }) => TanksService.remove(id, currentUser.id))
  .get('/:id/prediction', ({ params: { id }, currentUser }) => TanksService.getPrediction(id, currentUser.id))
  .post('/:id/adjust', ({ params: { id }, currentUser, body }) => TanksService.adjust(id, currentUser.id, body.adjustment), { body: AdjustTankBody })
```

### Service Pattern (Static Methods)

```typescript
// src/modules/tanks/service.ts
import { prisma } from '../../lib/prisma'
import { HttpError } from '../../lib/errors'
import { EstimationService } from '../estimation/service'

export abstract class TanksService {
  static async create(userId: string, dto: {...}) {
    const location = await prisma.location.findUnique({ where: { id: dto.locationId } })
    if (!location) throw new HttpError(404, 'Location not found')
    if (location.userId !== userId) throw new HttpError(403, 'Forbidden')
    // ... business logic
  }
}
```

### Cron Scheduler

```typescript
// src/modules/estimation/scheduler.ts
import { Elysia } from 'elysia'
import { cron } from '@elysiajs/cron'

export const estimationScheduler = new Elysia({ name: 'estimation.scheduler' })
  .use(cron({
    name: 'low-gas-alert',
    pattern: '0 0 * * *',
    async run() {
      // Check all active tanks, send notifications for preemptly zone
    }
  }))
```

### App Composition

```typescript
// src/index.ts
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { authRoutes } from './modules/auth'
import { usersRoutes } from './modules/users'
// ... all other modules

const app = new Elysia({ prefix: '/api' })
  .use(cors({ origin: process.env.WEB_URL || 'http://localhost:3001', credentials: true }))
  .error({ HttpError })
  .onError(/* ... */)
  .use(authRoutes)
  .use(usersRoutes)
  .use(locationsRoutes)
  .use(tanksRoutes)
  .use(refillsRoutes)
  .use(ordersRoutes)
  .use(retailersRoutes)
  .use(ridersRoutes)
  .use(linkingRoutes)
  .use(discountsRoutes)
  .use(notificationsRoutes)
  .use(healthRoutes)
  .use(estimationScheduler)
  .listen(process.env.PORT || 3000)

export type App = typeof app  // For future Eden treaty
```

---

## Implementation Steps

### Step 1: Scaffolding & Infrastructure

1. Create `apps/api-elysia/` directory
2. Create `package.json`:
   ```json
   {
     "name": "api-elysia",
     "version": "0.1.0",
     "private": true,
     "scripts": {
       "dev": "bun --watch src/index.ts",
       "start": "bun src/index.ts",
       "test": "bun test",
       "typecheck": "tsc --noEmit"
     },
     "dependencies": {
       "elysia": "^1.2.0",
       "@elysiajs/cors": "^1.2.0",
       "@elysiajs/jwt": "^1.2.0",
       "@elysiajs/cron": "^1.2.0",
       "@prisma/client": "^7.4.0"
     },
     "devDependencies": {
       "@types/bun": "latest",
       "prisma": "^7.4.0",
       "typescript": "^5.7.3"
     }
   }
   ```
3. Create `tsconfig.json` (ESNext, bundler moduleResolution, bun-types)
4. Add `"apps/api-elysia"` to root `package.json` workspaces
5. Create `src/lib/prisma.ts`, `src/lib/errors.ts`
6. Create `src/index.ts` with CORS + error handler
7. Create `src/modules/health/index.ts`
8. Verify `GET /api/health` works

### Step 2: Auth Infrastructure

1. Create `src/lib/auth.ts` — JWT plugin + auth derive (3 roles: user, retailer, rider)
2. Create `src/lib/otp-sender.ts` — interface + ConsoleOtpSender
3. Port auth module from `apps/api/src/auth/auth.service.ts`
4. Add rider OTP verification route

### Step 3: Core CRUD Modules (port from NestJS)

Port in dependency order:
1. **users** — port from `apps/api/src/users/`
2. **locations** — port from `apps/api/src/locations/`
3. **estimation engine** — copy `estimation.engine.ts`, remove `@Injectable()`, add VERY_HEAVY profile
4. **estimation service** — port from `apps/api/src/estimation/estimation.service.ts`
5. **tanks** — port from `apps/api/src/tanks/`
6. **refills** — port from `apps/api/src/refills/`
7. **notifications** — port from `apps/api/src/notifications/` (console logging)

### Step 4: Discount & Pricing System (NEW)

1. `discounts/service.ts`:
   - `calculateDiscount(retailerId, estimatedDaysRemaining)` — lookup tier config, return amount
   - `getRetailerTiers(retailerId)` — return tier configuration
   - `updateRetailerTiers(retailerId, tiers)` — set custom tiers
2. `discounts/model.ts` — TypeBox schemas for tier config
3. `discounts/index.ts` — routes

### Step 5: Retailers (expanded)

Port existing + add:
- `PUT /retailers/me/pricing` — base price per LPG size
- `PUT /retailers/me/discounts` — discount tier config (preemptly zone 1-10 days, default 5)
- `PATCH /retailers/me/discounts/toggle` — enable/disable
- `GET /retailers/me/riders` — list riders
- `POST /retailers/me/riders` — create rider account
- `DELETE /retailers/me/riders/:id` — remove rider

### Step 6: Order Lifecycle (reworked)

Internal states: `PENDING`, `PENDING_SMS`, `CONFIRMED`, `ASSIGNED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_RETAILER`, `REJECTED`

Customer endpoints:
- `POST /orders` — create (lock discount at creation)
- `GET /orders` — list (customer-friendly labels)
- `GET /orders/:id` — detail
- `PATCH /orders/:id/cancel` — cancel before OUT_FOR_DELIVERY

Retailer endpoints:
- `GET /retailers/me/orders` — list (retailer-friendly labels)
- `PATCH /orders/:id/confirm` — accept
- `PATCH /orders/:id/reject` — reject with reason
- `PATCH /orders/:id/assign` — assign rider
- `PATCH /orders/:id/discount` — override discount
- `POST /orders/manual` — enter SMS/call/walk-in order

Auto-actions on DELIVERED:
- Reset estimation (new full tank)
- Create refill log
- Record payment (COD)

### Step 7: Rider Module (NEW)

- `GET /rider/deliveries` — today's assigned orders
- `GET /rider/prospects` — customers in preemptly zone sorted by urgency
- `POST /rider/customers` — register new customer on first delivery
- `POST /rider/deliveries/:id/start` — mark OUT_FOR_DELIVERY
- `POST /rider/deliveries/:id/confirm` — confirm delivery (method: QR/code/manual)
- `GET /rider/history` — past deliveries

### Step 8: Linking (expanded)

Port existing + add:
- `isPrimary` flag support
- `PATCH /link/retailer/:retailerId/primary` — set as primary

### Step 9: Estimation Scheduler

- `@elysiajs/cron` — daily at midnight UTC
- Use retailer-specific preemptly zone threshold (not hardcoded)
- Notify when customer enters preemptly zone

### Step 10: Wire & Verify

1. Import all module plugins in `src/index.ts`
2. Add root scripts: `"api-elysia:dev"`, `"api-elysia:start"`
3. Run `bun install`
4. Verify all endpoints

---

## Complete Route Table

### Public Routes (no auth)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/send-otp` | Send OTP code |
| POST | `/api/auth/verify-otp` | Verify OTP, login user |
| POST | `/api/auth/retailer/verify-otp` | Verify OTP, login retailer |
| POST | `/api/auth/rider/verify-otp` | Verify OTP, login rider (NEW) |
| GET | `/api/link/retailer/:code` | Resolve invite code |
| POST | `/api/retailers/register` | Register retailer |

### Customer Routes (user auth)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/me` | Get profile |
| PATCH | `/api/users/me` | Update profile |
| POST | `/api/locations` | Create location |
| GET | `/api/locations` | List locations |
| GET | `/api/locations/:id` | Get location |
| PATCH | `/api/locations/:id` | Update location |
| DELETE | `/api/locations/:id` | Delete location |
| POST | `/api/tanks` | Create tank |
| GET | `/api/tanks` | List tanks |
| GET | `/api/tanks/:id` | Get tank |
| PATCH | `/api/tanks/:id` | Update tank |
| DELETE | `/api/tanks/:id` | Delete tank |
| GET | `/api/tanks/:id/prediction` | Get refill prediction |
| POST | `/api/tanks/:id/adjust` | Apply cooking adjustment |
| POST | `/api/refills` | Log refill |
| GET | `/api/refills/tank/:tankId` | Get refill history |
| PATCH | `/api/refills/:id/confirm` | Confirm outlier |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | List orders (customer view) |
| GET | `/api/orders/:id` | Get order detail |
| PATCH | `/api/orders/:id/cancel` | Cancel order |
| POST | `/api/link/retailer` | Link to retailer |
| DELETE | `/api/link/retailer/:retailerId` | Unlink from retailer |
| GET | `/api/link/retailers` | Get linked retailers |
| PATCH | `/api/link/retailer/:retailerId/primary` | Set primary retailer (NEW) |
| POST | `/api/notifications/device-token` | Register device token |

### Retailer Routes (retailer auth)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/retailers/me` | Get profile |
| PATCH | `/api/retailers/me` | Update profile |
| GET | `/api/retailers/me/dashboard` | Dashboard stats |
| GET | `/api/retailers/me/customers` | Customer list with status |
| GET | `/api/retailers/me/orders` | Orders (retailer view) |
| GET | `/api/retailers/me/invite-stats` | Invite analytics |
| PUT | `/api/retailers/me/pricing` | Set base price per LPG size (NEW) |
| GET | `/api/retailers/me/discounts` | Get discount config (NEW) |
| PUT | `/api/retailers/me/discounts` | Set discount tiers (NEW) |
| PATCH | `/api/retailers/me/discounts/toggle` | Enable/disable discounts (NEW) |
| GET | `/api/retailers/me/riders` | List riders (NEW) |
| POST | `/api/retailers/me/riders` | Create rider (NEW) |
| DELETE | `/api/retailers/me/riders/:id` | Remove rider (NEW) |
| PATCH | `/api/orders/:id/confirm` | Accept order (NEW) |
| PATCH | `/api/orders/:id/reject` | Reject order with reason (NEW) |
| PATCH | `/api/orders/:id/assign` | Assign rider to order (NEW) |
| PATCH | `/api/orders/:id/discount` | Override discount (NEW) |
| POST | `/api/orders/manual` | Enter manual order (NEW) |

### Rider Routes (rider auth) — ALL NEW

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/rider/deliveries` | Today's assigned orders |
| GET | `/api/rider/prospects` | Customers in preemptly zone |
| POST | `/api/rider/customers` | Register new customer |
| POST | `/api/rider/deliveries/:id/start` | Start delivery |
| POST | `/api/rider/deliveries/:id/confirm` | Confirm delivery |
| GET | `/api/rider/history` | Delivery history |

---

## Package Dependencies

### Current NestJS (`apps/api`)
```
@nestjs/common, @nestjs/core, @nestjs/platform-express, @nestjs/config,
@nestjs/schedule, @nestjs/passport, @nestjs/jwt, passport, passport-jwt,
class-validator, class-transformer, reflect-metadata, rxjs,
@prisma/client, firebase-admin
(~25 runtime dependencies)
```

### New Elysia (`apps/api-elysia`)
```
elysia, @elysiajs/cors, @elysiajs/jwt, @elysiajs/cron, @prisma/client
(5 runtime dependencies, firebase-admin added later)
```

---

## Risk Mitigation

1. **Prisma + Bun:** Prisma 7.x works with Bun. Use `bunx prisma generate` early. Fallback: `npx prisma generate` for codegen, Bun for runtime.
2. **JWT compatibility:** `@elysiajs/jwt` defaults to HS256, same as passport-jwt. Existing tokens remain valid.
3. **API contract:** Same route paths, same request/response shapes. Flutter and Next.js clients don't need changes (just point to new port during dev).
4. **CORS:** `@elysiajs/cors` mirrors Express CORS behavior.

---

## Future: Eden Treaty for Web Dashboard

After the Elysia API is stable, the Next.js dashboard can use Eden treaty for end-to-end type safety:

```typescript
import { treaty } from '@elysiajs/eden'
import type { App } from 'api-elysia'

export const api = treaty<App>('http://localhost:3000')
const { data } = await api.api.retailers.me.dashboard.get({
  headers: { authorization: `Bearer ${token}` }
})
// data is fully typed — no manual interface definitions needed
```

This eliminates the need for `packages/shared-types` for the web dashboard. Flutter continues using REST directly.

---

## Verification Checklist

- [ ] `bun install` succeeds in `apps/api-elysia`
- [ ] `GET /api/health` returns `{ status: "ok" }`
- [ ] Auth flow: send-otp → verify-otp → JWT → protected routes
- [ ] `bun test` passes estimation engine tests (25 cases)
- [ ] All ported routes return same response shapes as NestJS
- [ ] New rider routes respond correctly
- [ ] Discount calculation works with retailer-configured tiers
- [ ] Order lifecycle transitions work for all 3 roles
- [ ] Cron scheduler runs at midnight UTC
