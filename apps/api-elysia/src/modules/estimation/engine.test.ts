import { describe, it, expect, beforeEach } from "bun:test";
import { EstimationEngine } from "./engine";

describe("EstimationEngine", () => {
  let engine: EstimationEngine;

  beforeEach(() => {
    engine = new EstimationEngine();
  });

  describe("getUsageProfile", () => {
    it("should return correct profile for HOME_LIGHT", () => {
      const profile = engine.getUsageProfile("HOME", "LIGHT");
      expect(profile.midKgPerDay).toBe(0.225);
    });

    it("should return correct profile for HOME_MODERATE", () => {
      const profile = engine.getUsageProfile("HOME", "MODERATE");
      expect(profile.midKgPerDay).toBe(0.30);
    });

    it("should return correct profile for BUSINESS_HEAVY", () => {
      const profile = engine.getUsageProfile("BUSINESS", "HEAVY");
      expect(profile.midKgPerDay).toBe(7.0);
    });

    it("should fallback to HOME_MODERATE for unknown profile", () => {
      const profile = engine.getUsageProfile("UNKNOWN", "UNKNOWN");
      expect(profile.midKgPerDay).toBe(0.30);
    });

    it("should return correct profile for HOME_VERY_HEAVY", () => {
      const profile = engine.getUsageProfile("HOME", "VERY_HEAVY");
      expect(profile.midKgPerDay).toBe(0.55);
    });

    it("should estimate ~20 days for 11kg HOME/VERY_HEAVY", () => {
      const profile = engine.getUsageProfile("HOME", "VERY_HEAVY");
      const estimate = engine.calculateTimeBasedEstimate(11, profile);
      expect(estimate).toBe(20); // 11 / 0.55 = 20
    });
  });

  describe("calculateTimeBasedEstimate", () => {
    it("should calculate cold start for 11kg HOME/MODERATE", () => {
      const profile = engine.getUsageProfile("HOME", "MODERATE");
      const estimate = engine.calculateTimeBasedEstimate(11, profile);
      expect(estimate).toBe(37); // 11 / 0.30 = 36.67 ≈ 37
    });

    it("should calculate cold start for 22kg HOME/HEAVY", () => {
      const profile = engine.getUsageProfile("HOME", "HEAVY");
      const estimate = engine.calculateTimeBasedEstimate(22, profile);
      expect(estimate).toBe(55); // 22 / 0.40 = 55
    });

    it("should calculate cold start for 50kg BUSINESS/MODERATE", () => {
      const profile = engine.getUsageProfile("BUSINESS", "MODERATE");
      const estimate = engine.calculateTimeBasedEstimate(50, profile);
      expect(estimate).toBe(10); // 50 / 5.0 = 10
    });
  });

  describe("calculateCorrectionFactor", () => {
    it("should return 1.0 with no refill logs", () => {
      const factor = engine.calculateCorrectionFactor(37, []);
      expect(factor).toBe(1.0);
    });

    it("should calculate correction with one valid log", () => {
      const factor = engine.calculateCorrectionFactor(37, [
        { actualCycleDays: 40, isOutlier: false },
      ]);
      expect(factor).toBeCloseTo(40 / 37, 2);
    });

    it("should weight outliers at 0.3", () => {
      const factor = engine.calculateCorrectionFactor(37, [
        { actualCycleDays: 40, isOutlier: false },
        { actualCycleDays: 15, isOutlier: true },
      ]);
      const expectedAvg = (40 * 1.0 + 15 * 0.3) / (1.0 + 0.3);
      expect(factor).toBeCloseTo(expectedAvg / 37, 2);
    });

    it("should ignore logs with null actualCycleDays", () => {
      const factor = engine.calculateCorrectionFactor(37, [
        { actualCycleDays: null, isOutlier: false },
        { actualCycleDays: 40, isOutlier: false },
      ]);
      expect(factor).toBeCloseTo(40 / 37, 2);
    });
  });

  describe("determineConfidence", () => {
    it("should return LOW for 0 refills", () => {
      const { confidence, margin } = engine.determineConfidence(0);
      expect(confidence).toBe("LOW");
      expect(margin).toBe(0.30);
    });

    it("should return MEDIUM for 1-2 refills", () => {
      expect(engine.determineConfidence(1).confidence).toBe("MEDIUM");
      expect(engine.determineConfidence(2).confidence).toBe("MEDIUM");
    });

    it("should return HIGH for 3+ refills", () => {
      expect(engine.determineConfidence(3).confidence).toBe("HIGH");
      expect(engine.determineConfidence(10).confidence).toBe("HIGH");
    });
  });

  describe("applyAdjustment", () => {
    it("should reduce estimate for COOKED_MORE", () => {
      const result = engine.applyAdjustment(37, "COOKED_MORE", new Date(Date.now() + 86400000));
      expect(result).toBe(31); // 37 * 0.85 = 31.45 ≈ 31
    });

    it("should increase estimate for COOKED_LESS", () => {
      const result = engine.applyAdjustment(37, "COOKED_LESS", new Date(Date.now() + 86400000));
      expect(result).toBe(43); // 37 * 1.15 = 42.55 ≈ 43
    });

    it("should not adjust for NORMAL", () => {
      const result = engine.applyAdjustment(37, "NORMAL", null);
      expect(result).toBe(37);
    });

    it("should not adjust if expired", () => {
      const result = engine.applyAdjustment(37, "COOKED_MORE", new Date(Date.now() - 86400000));
      expect(result).toBe(37);
    });

    it("should not adjust for null", () => {
      const result = engine.applyAdjustment(37, null, null);
      expect(result).toBe(37);
    });
  });

  describe("detectOutlier", () => {
    it("should detect outlier when cycle < 50% of average", () => {
      const isOutlier = engine.detectOutlier(15, [
        { actualCycleDays: 40 },
        { actualCycleDays: 38 },
      ]);
      expect(isOutlier).toBe(true);
    });

    it("should not flag normal cycles", () => {
      const isOutlier = engine.detectOutlier(35, [
        { actualCycleDays: 40 },
        { actualCycleDays: 38 },
      ]);
      expect(isOutlier).toBe(false);
    });

    it("should not detect outlier with no previous logs", () => {
      const isOutlier = engine.detectOutlier(15, []);
      expect(isOutlier).toBe(false);
    });
  });

  describe("calculateEstimation (full integration)", () => {
    it("should handle cold start with no refills", () => {
      const result = engine.calculateEstimation({
        capacityKg: 11,
        locationType: "HOME",
        usageLevel: "MODERATE",
        refillLogs: [],
        currentAdjustment: null,
        adjustmentExpiresAt: null,
      });
      expect(result.timeBasedEstimate).toBe(37);
      expect(result.correctionFactor).toBe(1.0);
      expect(result.calibratedEstimate).toBe(37);
      expect(result.confidence).toBe("LOW");
      expect(result.displayRange.low).toBe(26); // 37 * 0.70 = 25.9 ≈ 26
      expect(result.displayRange.high).toBe(48); // 37 * 1.30 = 48.1 ≈ 48
    });

    it("should calibrate with 3+ refills (HIGH confidence)", () => {
      const result = engine.calculateEstimation({
        capacityKg: 11,
        locationType: "HOME",
        usageLevel: "MODERATE",
        refillLogs: [
          { actualCycleDays: 40, isOutlier: false },
          { actualCycleDays: 42, isOutlier: false },
          { actualCycleDays: 38, isOutlier: false },
        ],
        currentAdjustment: null,
        adjustmentExpiresAt: null,
      });
      expect(result.confidence).toBe("HIGH");
      expect(result.confidenceMargin).toBe(0.10);
      expect(result.calibratedEstimate).toBe(40);
    });

    it("should apply adjustment on top of calibration", () => {
      const result = engine.calculateEstimation({
        capacityKg: 11,
        locationType: "HOME",
        usageLevel: "MODERATE",
        refillLogs: [
          { actualCycleDays: 40, isOutlier: false },
          { actualCycleDays: 42, isOutlier: false },
          { actualCycleDays: 38, isOutlier: false },
        ],
        currentAdjustment: "COOKED_MORE",
        adjustmentExpiresAt: new Date(Date.now() + 86400000),
      });
      expect(result.calibratedEstimate).toBe(34); // 40 * 0.85 = 34
    });

    it("should handle VERY_HEAVY cold start for 11kg", () => {
      const result = engine.calculateEstimation({
        capacityKg: 11,
        locationType: "HOME",
        usageLevel: "VERY_HEAVY",
        refillLogs: [],
        currentAdjustment: null,
        adjustmentExpiresAt: null,
      });
      expect(result.timeBasedEstimate).toBe(20); // 11 / 0.55 = 20
      expect(result.confidence).toBe("LOW");
    });
  });
});
