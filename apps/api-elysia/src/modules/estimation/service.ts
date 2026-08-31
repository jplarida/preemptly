import { prisma } from "../../lib/prisma";
import { estimationEngine } from "./engine";

export class EstimationService {
  static async getOrCreateEstimation(tankId: string) {
    const tank = await prisma.tank.findUnique({
      where: { id: tankId },
      include: {
        location: true,
        estimation: true,
        refillLogs: { orderBy: { refillDate: "asc" } },
      },
    });

    if (!tank) throw new Error("Tank not found");

    const result = estimationEngine.calculateEstimation({
      capacityKg: tank.capacityKg,
      locationType: tank.location.type as "HOME" | "BUSINESS",
      usageLevel: tank.usageLevel as any,
      refillLogs: tank.refillLogs,
      currentAdjustment: tank.estimation?.currentAdjustment as any,
      adjustmentExpiresAt: tank.estimation?.adjustmentExpiresAt || null,
    });

    await prisma.estimation.upsert({
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

  static async getPrediction(tankId: string) {
    const tank = await prisma.tank.findUnique({
      where: { id: tankId },
      include: {
        location: true,
        estimation: true,
        refillLogs: { orderBy: { refillDate: "asc" } },
      },
    });

    if (!tank) throw new Error("Tank not found");

    const estimation = estimationEngine.calculateEstimation({
      capacityKg: tank.capacityKg,
      locationType: tank.location.type as "HOME" | "BUSINESS",
      usageLevel: tank.usageLevel as any,
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

  static async recalculateAfterRefill(tankId: string) {
    return this.getOrCreateEstimation(tankId);
  }
}
