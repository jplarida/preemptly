import { mock } from "bun:test";

// ---------------------------------------------------------------------------
// Mock Prisma — must run as preload BEFORE any module imports prisma
// ---------------------------------------------------------------------------

function makeMockModel() {
  return {
    findUnique: mock(() => null),
    findFirst: mock(() => null),
    findMany: mock(() => []),
    create: mock(() => ({})),
    update: mock(() => ({})),
    updateMany: mock(() => ({ count: 0 })),
    upsert: mock(() => ({})),
    delete: mock(() => ({})),
    deleteMany: mock(() => ({ count: 0 })),
    count: mock(() => 0),
  };
}

const mockPrisma = {
  $queryRaw: mock(() => [{ 1: 1 }]),
  user: makeMockModel(),
  location: makeMockModel(),
  tank: makeMockModel(),
  estimation: makeMockModel(),
  refillLog: makeMockModel(),
  accuracyLog: makeMockModel(),
  retailer: makeMockModel(),
  retailerSettings: makeMockModel(),
  rider: makeMockModel(),
  customerRetailerLink: makeMockModel(),
  order: makeMockModel(),
  inviteStat: makeMockModel(),
  otpCode: makeMockModel(),
  deviceToken: makeMockModel(),
};

// Store on globalThis so test files can access it
(globalThis as any).__mockPrisma = mockPrisma;

mock.module("../lib/prisma", () => ({ prisma: mockPrisma }));

mock.module("../modules/estimation/service", () => ({
  EstimationService: {
    getOrCreateEstimation: mock(() => ({
      timeBasedEstimate: 30,
      correctionFactor: 1.0,
      calibratedEstimate: 30,
      confidence: "MEDIUM",
      confidenceMargin: 0.2,
      displayRange: { low: 24, high: 36 },
    })),
    getPrediction: mock(() => ({
      tankId: "tank-1",
      daysElapsed: 5,
      estimatedTotalDays: 30,
      estimatedRemainingDays: 25,
      displayRange: { low: 24, high: 36 },
      confidence: "MEDIUM",
      refillCount: 2,
      currentAdjustment: null,
    })),
    recalculateAfterRefill: mock(() => ({})),
  },
}));

// Re-export real EstimationEngine class but mock the singleton instance.
// engine.ts is pure (no imports), so require() is safe here.
const { EstimationEngine } = require("../modules/estimation/engine");
mock.module("../modules/estimation/engine", () => ({
  EstimationEngine,
  estimationEngine: {
    detectOutlier: mock(() => false),
    calculateEstimation: mock(() => ({
      timeBasedEstimate: 30,
      correctionFactor: 1.0,
      calibratedEstimate: 30,
      confidence: "MEDIUM",
      confidenceMargin: 0.2,
      displayRange: { low: 24, high: 36 },
    })),
  },
}));

mock.module("../lib/otp-sender", () => ({
  otpSender: { send: mock(() => Promise.resolve()) },
}));
