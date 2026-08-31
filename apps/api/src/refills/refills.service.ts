import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstimationEngine } from '../estimation/estimation.engine';
import { EstimationService } from '../estimation/estimation.service';
import { LogRefillDto } from './dto/log-refill.dto';

@Injectable()
export class RefillsService {
  constructor(
    private prisma: PrismaService,
    private engine: EstimationEngine,
    private estimationService: EstimationService,
  ) {}

  async logRefill(userId: string, dto: LogRefillDto) {
    const tank = await this.prisma.tank.findUnique({
      where: { id: dto.tankId },
      include: {
        location: true,
        refillLogs: { orderBy: { refillDate: 'desc' } },
        estimation: true,
      },
    });

    if (!tank) throw new NotFoundException('Tank not found');
    if (tank.location.userId !== userId) throw new ForbiddenException();

    const refillDate = dto.refillDate ? new Date(dto.refillDate) : new Date();

    // Calculate actual cycle days
    const lastRefill = tank.lastRefillDate;
    const actualCycleDays = Math.floor(
      (refillDate.getTime() - lastRefill.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Detect outlier
    const isOutlier = this.engine.detectOutlier(actualCycleDays, tank.refillLogs);

    // Log refill
    const refillLog = await this.prisma.refillLog.create({
      data: {
        tankId: dto.tankId,
        refillDate,
        actualCycleDays: actualCycleDays > 0 ? actualCycleDays : null,
        isOutlier,
        confirmedByUser: dto.confirmOutlier || false,
      },
    });

    // Update tank's last refill date
    await this.prisma.tank.update({
      where: { id: dto.tankId },
      data: { lastRefillDate: refillDate },
    });

    // Log accuracy if we had an estimation
    if (tank.estimation && actualCycleDays > 0) {
      const predictedDays = tank.estimation.calibratedEstimate;
      await this.prisma.accuracyLog.create({
        data: {
          tankId: dto.tankId,
          predictedDays,
          actualDays: actualCycleDays,
          errorDays: predictedDays - actualCycleDays,
        },
      });
    }

    // Recalculate estimation
    await this.estimationService.recalculateAfterRefill(dto.tankId);

    // Clear any active adjustment
    if (tank.estimation) {
      await this.prisma.estimation.update({
        where: { tankId: dto.tankId },
        data: {
          currentAdjustment: null,
          adjustmentExpiresAt: null,
        },
      });
    }

    return {
      ...refillLog,
      isOutlier,
      actualCycleDays,
    };
  }

  async getHistory(tankId: string, userId: string) {
    const tank = await this.prisma.tank.findUnique({
      where: { id: tankId },
      include: { location: true },
    });
    if (!tank) throw new NotFoundException('Tank not found');
    if (tank.location.userId !== userId) throw new ForbiddenException();

    return this.prisma.refillLog.findMany({
      where: { tankId },
      orderBy: { refillDate: 'desc' },
    });
  }

  async confirmOutlier(refillLogId: string, userId: string) {
    const refillLog = await this.prisma.refillLog.findUnique({
      where: { id: refillLogId },
      include: { tank: { include: { location: true } } },
    });
    if (!refillLog) throw new NotFoundException('Refill log not found');
    if (refillLog.tank.location.userId !== userId) throw new ForbiddenException();

    return this.prisma.refillLog.update({
      where: { id: refillLogId },
      data: { confirmedByUser: true, isOutlier: false },
    });
  }
}
