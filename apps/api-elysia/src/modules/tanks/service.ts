import { prisma } from "../../lib/prisma";
import { notFound, forbidden } from "../../lib/errors";
import { EstimationService } from "../estimation/service";

export class TanksService {
  static async create(userId: string, data: { locationId: string; capacityKg: number; unit?: string; model: string; usageLevel: string }) {
    const location = await prisma.location.findUnique({ where: { id: data.locationId } });
    if (!location) notFound("Location not found");
    if (location.userId !== userId) forbidden();

    const tank = await prisma.tank.create({
      data: {
        locationId: data.locationId,
        capacityKg: data.capacityKg,
        unit: data.unit || "kg",
        model: data.model as any,
        usageLevel: data.usageLevel as any,
        lastRefillDate: new Date(),
      },
    });

    await EstimationService.getOrCreateEstimation(tank.id);
    return tank;
  }

  static async findAllByUser(userId: string) {
    return prisma.tank.findMany({
      where: { location: { userId } },
      include: { location: true, estimation: true },
    });
  }

  static async findOne(id: string, userId: string) {
    const tank = await prisma.tank.findUnique({
      where: { id },
      include: {
        location: true,
        estimation: true,
        refillLogs: { orderBy: { refillDate: "desc" }, take: 10 },
      },
    });
    if (!tank) notFound("Tank not found");
    if (tank.location.userId !== userId) forbidden();
    return tank;
  }

  static async update(id: string, userId: string, data: Record<string, any>) {
    const tank = await prisma.tank.findUnique({ where: { id }, include: { location: true } });
    if (!tank) notFound("Tank not found");
    if (tank.location.userId !== userId) forbidden();

    const updated = await prisma.tank.update({ where: { id }, data: data as any });

    if (data.capacityKg || data.usageLevel) {
      await EstimationService.getOrCreateEstimation(id);
    }

    return updated;
  }

  static async remove(id: string, userId: string) {
    const tank = await prisma.tank.findUnique({ where: { id }, include: { location: true } });
    if (!tank) notFound("Tank not found");
    if (tank.location.userId !== userId) forbidden();
    return prisma.tank.delete({ where: { id } });
  }

  static async getPrediction(id: string, userId: string) {
    const tank = await prisma.tank.findUnique({ where: { id }, include: { location: true } });
    if (!tank) notFound("Tank not found");
    if (tank.location.userId !== userId) forbidden();
    return EstimationService.getPrediction(id);
  }

  static async adjust(id: string, userId: string, adjustment: string) {
    const tank = await prisma.tank.findUnique({ where: { id }, include: { location: true } });
    if (!tank) notFound("Tank not found");
    if (tank.location.userId !== userId) forbidden();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.estimation.update({
      where: { tankId: id },
      data: {
        currentAdjustment: adjustment as any,
        adjustmentExpiresAt: expiresAt,
      },
    });

    return EstimationService.getPrediction(id);
  }
}
