import { Injectable } from '@nestjs/common';

export interface UsageProfile {
  minKgPerDay: number;
  maxKgPerDay: number;
  midKgPerDay: number;
}

export interface EstimationInput {
  capacityKg: number;
  locationType: 'HOME' | 'BUSINESS';
  usageLevel: 'LIGHT' | 'MODERATE' | 'HEAVY';
  refillLogs: Array<{
    actualCycleDays: number | null;
    isOutlier: boolean;
  }>;
  currentAdjustment: 'COOKED_MORE' | 'COOKED_LESS' | 'NORMAL' | null;
  adjustmentExpiresAt: Date | null;
}

export interface EstimationResult {
  timeBasedEstimate: number;
  correctionFactor: number;
  calibratedEstimate: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceMargin: number;
  displayRange: { low: number; high: number };
}

const USAGE_PROFILES: Record<string, UsageProfile> = {
  'HOME_LIGHT':     { minKgPerDay: 0.20, maxKgPerDay: 0.25, midKgPerDay: 0.225 },
  'HOME_MODERATE':  { minKgPerDay: 0.25, maxKgPerDay: 0.35, midKgPerDay: 0.30 },
  'HOME_HEAVY':     { minKgPerDay: 0.35, maxKgPerDay: 0.45, midKgPerDay: 0.40 },
  'BUSINESS_LIGHT': { minKgPerDay: 2.0,  maxKgPerDay: 4.0,  midKgPerDay: 3.0 },
  'BUSINESS_MODERATE': { minKgPerDay: 4.0, maxKgPerDay: 6.0, midKgPerDay: 5.0 },
  'BUSINESS_HEAVY': { minKgPerDay: 6.0,  maxKgPerDay: 8.0,  midKgPerDay: 7.0 },
};

const ADJUSTMENT_MULTIPLIERS = {
  COOKED_MORE: 0.85,
  COOKED_LESS: 1.15,
  NORMAL: 1.0,
};

const CONFIDENCE_MARGINS = {
  LOW: 0.30,    // ±30%
  MEDIUM: 0.20, // ±20%
  HIGH: 0.10,   // ±10%
};

@Injectable()
export class EstimationEngine {
  getUsageProfile(locationType: string, usageLevel: string): UsageProfile {
    const key = `${locationType}_${usageLevel}`;
    return USAGE_PROFILES[key] || USAGE_PROFILES['HOME_MODERATE'];
  }

  calculateTimeBasedEstimate(capacityKg: number, profile: UsageProfile): number {
    return Math.round(capacityKg / profile.midKgPerDay);
  }

  calculateCorrectionFactor(
    timeBasedEstimate: number,
    refillLogs: Array<{ actualCycleDays: number | null; isOutlier: boolean }>,
  ): number {
    const validLogs = refillLogs.filter((log) => log.actualCycleDays !== null);
    if (validLogs.length === 0) return 1.0;

    let weightedSum = 0;
    let weightTotal = 0;

    for (const log of validLogs) {
      const weight = log.isOutlier ? 0.3 : 1.0;
      weightedSum += log.actualCycleDays! * weight;
      weightTotal += weight;
    }

    const weightedAverage = weightedSum / weightTotal;
    return weightedAverage / timeBasedEstimate;
  }

  determineConfidence(refillCount: number): { confidence: 'LOW' | 'MEDIUM' | 'HIGH'; margin: number } {
    if (refillCount === 0) return { confidence: 'LOW', margin: CONFIDENCE_MARGINS.LOW };
    if (refillCount <= 2) return { confidence: 'MEDIUM', margin: CONFIDENCE_MARGINS.MEDIUM };
    return { confidence: 'HIGH', margin: CONFIDENCE_MARGINS.HIGH };
  }

  applyAdjustment(
    estimate: number,
    adjustment: 'COOKED_MORE' | 'COOKED_LESS' | 'NORMAL' | null,
    expiresAt: Date | null,
  ): number {
    if (!adjustment || adjustment === 'NORMAL') return estimate;
    if (expiresAt && expiresAt < new Date()) return estimate;
    return Math.round(estimate * ADJUSTMENT_MULTIPLIERS[adjustment]);
  }

  detectOutlier(newCycleDays: number, previousLogs: Array<{ actualCycleDays: number | null }>): boolean {
    const validDays = previousLogs
      .map((l) => l.actualCycleDays)
      .filter((d): d is number => d !== null);
    if (validDays.length === 0) return false;

    const average = validDays.reduce((a, b) => a + b, 0) / validDays.length;
    return newCycleDays < average * 0.5;
  }

  calculateEstimation(input: EstimationInput): EstimationResult {
    const profile = this.getUsageProfile(input.locationType, input.usageLevel);
    const timeBasedEstimate = this.calculateTimeBasedEstimate(input.capacityKg, profile);

    const validRefillCount = input.refillLogs.filter((l) => l.actualCycleDays !== null).length;
    const correctionFactor = this.calculateCorrectionFactor(timeBasedEstimate, input.refillLogs);

    const calibratedEstimate = Math.round(timeBasedEstimate * correctionFactor);

    const { confidence, margin } = this.determineConfidence(validRefillCount);

    const adjustedEstimate = this.applyAdjustment(
      calibratedEstimate,
      input.currentAdjustment,
      input.adjustmentExpiresAt,
    );

    const low = Math.max(1, Math.round(adjustedEstimate * (1 - margin)));
    const high = Math.round(adjustedEstimate * (1 + margin));

    return {
      timeBasedEstimate,
      correctionFactor,
      calibratedEstimate: adjustedEstimate,
      confidence,
      confidenceMargin: margin,
      displayRange: { low, high },
    };
  }
}
