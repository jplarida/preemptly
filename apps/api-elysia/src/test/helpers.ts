import { Elysia } from "elysia";
import { HttpError } from "../lib/errors";
import type { CurrentUser } from "../lib/auth";

// ---------------------------------------------------------------------------
// 1. Mock Prisma — populated by preload.ts via globalThis
// ---------------------------------------------------------------------------

export const mockPrisma = (globalThis as any).__mockPrisma as {
  $queryRaw: any;
  user: any;
  location: any;
  tank: any;
  estimation: any;
  refillLog: any;
  accuracyLog: any;
  retailer: any;
  retailerSettings: any;
  rider: any;
  customerRetailerLink: any;
  order: any;
  inviteStat: any;
  otpCode: any;
  deviceToken: any;
};

// ---------------------------------------------------------------------------
// 2. Test entity factories
// ---------------------------------------------------------------------------

export const mockUser = {
  id: "user-1",
  name: "Test User",
  phone: "+639170000001",
  region: "PH",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockRetailer = {
  id: "retailer-1",
  businessName: "Gas Store",
  ownerName: "Owner",
  phone: "+639170000002",
  address: "123 Main St",
  city: "Manila",
  inviteCode: "ABCD1234",
  inviteLink: "app.preemptly.com/join/ABCD1234",
  isActive: true,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockRider = {
  id: "rider-1",
  retailerId: "retailer-1",
  name: "Test Rider",
  phone: "+639170000003",
  isActive: true,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockLocation = {
  id: "location-1",
  userId: "user-1",
  address: "456 Street",
  type: "HOME",
  timezone: "Asia/Manila",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockTank = {
  id: "tank-1",
  locationId: "location-1",
  capacityKg: 11,
  unit: "kg",
  model: "EXCHANGE",
  usageLevel: "MODERATE",
  lastRefillDate: new Date("2025-01-01"),
  isActive: true,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockEstimation = {
  id: "est-1",
  tankId: "tank-1",
  timeBasedEstimate: 37,
  correctionFactor: 1.0,
  calibratedEstimate: 37,
  confidence: "LOW",
  currentAdjustment: null,
  adjustmentExpiresAt: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockOrder = {
  id: "order-1",
  tankId: "tank-1",
  customerId: "user-1",
  retailerId: "retailer-1",
  riderId: null,
  status: "PENDING",
  note: null,
  capacityKg: 11,
  deliveryAddress: "456 Street",
  basePrice: 500,
  discountAmount: 0,
  finalAmount: 500,
  paymentStatus: null,
  paymentMethod: null,
  confirmationMethod: null,
  confirmationCode: null,
  needsReview: false,
  deliveredAt: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

// ---------------------------------------------------------------------------
// 3. Test app builder
// ---------------------------------------------------------------------------

export function createTestApp(
  modulePlugin: Elysia<any, any, any, any, any, any, any, any>,
  role: "user" | "retailer" | "rider" = "user",
) {
  const currentUser: CurrentUser = role === "retailer"
    ? { id: "retailer-1", phone: mockRetailer.phone, role: "retailer", retailer: mockRetailer as any }
    : role === "rider"
      ? { id: "rider-1", phone: mockRider.phone, role: "rider", rider: mockRider as any }
      : { id: "user-1", phone: mockUser.phone, role: "user" };

  return new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.status;
        return {
          statusCode: error.status,
          message: error.message,
          timestamp: new Date().toISOString(),
        };
      }
      const status = (error as any).status ?? 500;
      set.status = status;
      return {
        statusCode: status,
        message: "message" in error ? (error as any).message : "Internal Server Error",
        timestamp: new Date().toISOString(),
      };
    })
    .derive(() => ({ currentUser }))
    .use(modulePlugin);
}

// ---------------------------------------------------------------------------
// 4. Request helper
// ---------------------------------------------------------------------------

export async function makeRequest(
  app: Elysia<any, any, any, any, any, any, any, any>,
  method: string,
  path: string,
  body?: unknown,
) {
  const init: RequestInit = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return app.handle(new Request(`http://localhost${path}`, init));
}

// ---------------------------------------------------------------------------
// 5. Reset all mocks
// ---------------------------------------------------------------------------

export function resetMocks() {
  const resetModel = (model: Record<string, any>) => {
    Object.values(model).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) {
        fn.mockClear();
      }
    });
  };

  mockPrisma.$queryRaw.mockClear();
  for (const [key, val] of Object.entries(mockPrisma)) {
    if (key === "$queryRaw") continue;
    resetModel(val as any);
  }
}
