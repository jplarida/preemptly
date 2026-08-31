import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstimationEngine } from './estimation.engine';

@Injectable()
export class EstimationService {
  constructor(
    private prisma: PrismaService,
    private engine: EstimationEngine,
  ) {}

  async getOrCreateEstimation(tankId: string) {
    const tank = await this.prisma.tank.findUnique({
      where: { id: tankId },
      include: {
        location: true,
        estimation: true,
        refillLogs: { orderBy: { refillDate: 'asc' } },
      },
    });

    if (!tank) throw new Error('Tank not found');

    const result = this.engine.calculateEstimation({
      capacityKg: tank.capacityKg,
      locationType: tank.location.type as 'HOME' | 'BUSINESS',
      usageLevel: tank.usageLevel as 'LIGHT' | 'MODERATE' | 'HEAVY',
      refillLogs: tank.refillLogs,
      currentAdjustment: tank.estimation?.currentAdjustment as any,
      adjustmentExpiresAt: tank.estimation?.adjustmentExpiresAt || null,
    });

    // Upsert estimation
    await this.prisma.estimation.upsert({
      where: { tankId },
      update: {
        timeBasedEstimate: result.timeBasedEstimate,
        correctionFactor: result.correctionFactor,
        calibratedEstimate: result.calibratedEstimate,
        confidence: result.confidence,
      },
      create: {
        tankId,
        timeBasedEstimate: result.timeBasedEstimate,
        correctionFactor: result.correctionFactor,
        calibratedEstimate: result.calibratedEstimate,
        confidence: result.confidence,
      },
    });

    return result;
  }

  async getPrediction(tankId: string) {
    const tank = await this.prisma.tank.findUnique({
      where: { id: tankId },
      include: {
        location: true,
        estimation: true,
        refillLogs: { orderBy: { refillDate: 'asc' } },
      },
    });

    if (!tank) throw new Error('Tank not found');

    const estimation = this.engine.calculateEstimation({
      capacityKg: tank.capacityKg,
      locationType: tank.location.type as 'HOME' | 'BUSINESS',
      usageLevel: tank.usageLevel as 'LIGHT' | 'MODERATE' | 'HEAVY',
      refillLogs: tank.refillLogs,
      currentAdjustment: tank.estimation?.currentAdjustment as any,
      adjustmentExpiresAt: tank.estimation?.adjustmentExpiresAt || null,
    });

    const daysElapsed = Math.floor(
      (Date.now() - tank.lastRefillDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const estimatedRemainingDays = Math.max(0, estimation.calibratedEstimate - daysElapsed);
    const refillCount = tank.refillLogs.filter((l) => l.actualCycleDays !== null).length;

    return {
      tankId,
      daysElapsed,
      estimatedTotalDays: estimation.calibratedEstimate,
      estimatedRemainingDays,
      displayRange: estimation.displayRange,
      confidence: estimation.confidence,
      refillCount,
      currentAdjustment: tank.estimation?.currentAdjustment || null,
    };
  }

  async recalculateAfterRefill(tankId: string) {
    return this.getOrCreateEstimation(tankId);
  }
}
