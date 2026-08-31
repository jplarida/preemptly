import { prisma } from "../../lib/prisma";
import { notFound, forbidden } from "../../lib/errors";
import { estimationEngine } from "../estimation/engine";
import { EstimationService } from "../estimation/service";

export class RefillsService {
  static async logRefill(userId: string, data: { tankId: string; refillDate?: string; confirmOutlier?: boolean }) {
    const tank = await prisma.tank.findUnique({
      where: { id: data.tankId },
      include: {
        location: true,
        refillLogs: { orderBy: { refillDate: "desc" } },
        estimation: true,
      },
    });

    if (!tank) notFound("Tank not found");
    if (tank.location.userId !== userId) forbidden();

    const refillDate = data.refillDate ? new Date(data.refillDate) : new Date();
    const lastRefill = tank.lastRefillDate;
    const actualCycleDays = Math.floor(
      (refillDate.getTime() - lastRefill.getTime()) / (1000 * 60 * 60 * 24),
    );

    const isOutlier = estimationEngine.detectOutlier(actualCycleDays, tank.refillLogs);

    const refillLog = await prisma.refillLog.create({
      data: {
        tankId: data.tankId,
        refillDate,
        actualCycleDays: actualCycleDays > 0 ? actualCycleDays : null,
        isOutlier,
        confirmedByUser: data.confirmOutlier || false,
      },
    });

    await prisma.tank.update({
      where: { id: data.tankId },
      data: { lastRefillDate: refillDate },
    });

    if (tank.estimation && actualCycleDays > 0) {
      const predictedDays = tank.estimation.calibratedEstimate;
      await prisma.accuracyLog.create({
        data: {
          tankId: data.tankId,
          predictedDays,
          actualDays: actualCycleDays,
          errorDays: predictedDays - actualCycleDays,
        },
      });
    }

    await EstimationService.recalculateAfterRefill(data.tankId);

    if (tank.estimation) {
      await prisma.estimation.update({
        where: { tankId: data.tankId },
        data: { currentAdjustment: null, adjustmentExpiresAt: null },
      });
    }

    return { ...refillLog, isOutlier, actualCycleDays };
  }

  static async getHistory(tankId: string, userId: string) {
    const tank = await prisma.tank.findUnique({
      where: { id: tankId },
      include: { location: true },
    });
    if (!tank) notFound("Tank not found");
    if (tank.location.userId !== userId) forbidden();

    return prisma.refillLog.findMany({
      where: { tankId },
      orderBy: { refillDate: "desc" },
    });
  }

  static async confirmOutlier(refillLogId: string, userId: string) {
    const refillLog = await prisma.refillLog.findUnique({
      where: { id: refillLogId },
      include: { tank: { include: { location: true } } },
    });
    if (!refillLog) notFound("Refill log not found");
    if (refillLog.tank.location.userId !== userId) forbidden();

    return prisma.refillLog.update({
      where: { id: refillLogId },
      data: { confirmedByUser: true, isOutlier: false },
    });
  }
}
