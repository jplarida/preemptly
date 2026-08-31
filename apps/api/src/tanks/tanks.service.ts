import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstimationService } from '../estimation/estimation.service';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';

@Injectable()
export class TanksService {
  constructor(
    private prisma: PrismaService,
    private estimationService: EstimationService,
  ) {}

  async create(userId: string, dto: CreateTankDto) {
    // Verify location belongs to user
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });
    if (!location) throw new NotFoundException('Location not found');
    if (location.userId !== userId) throw new ForbiddenException();

    const tank = await this.prisma.tank.create({
      data: {
        locationId: dto.locationId,
        capacityKg: dto.capacityKg,
        unit: dto.unit || 'kg',
        model: dto.model as any,
        usageLevel: dto.usageLevel as any,
        lastRefillDate: new Date(),
      },
    });

    // Create initial estimation
    await this.estimationService.getOrCreateEstimation(tank.id);

    return tank;
  }

  async findAllByUser(userId: string) {
    return this.prisma.tank.findMany({
      where: {
        location: { userId },
      },
      include: {
        location: true,
        estimation: true,
      },
    });
  }

  async findOne(id: string, userId: string) {
    const tank = await this.prisma.tank.findUnique({
      where: { id },
      include: {
        location: true,
        estimation: true,
        refillLogs: { orderBy: { refillDate: 'desc' }, take: 10 },
      },
    });
    if (!tank) throw new NotFoundException('Tank not found');
    if (tank.location.userId !== userId) throw new ForbiddenException();
    return tank;
  }

  async update(id: string, userId: string, dto: UpdateTankDto) {
    const tank = await this.prisma.tank.findUnique({
      where: { id },
      include: { location: true },
    });
    if (!tank) throw new NotFoundException('Tank not found');
    if (tank.location.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.tank.update({
      where: { id },
      data: dto as any,
    });

    // Recalculate estimation if capacity or usage level changed
    if (dto.capacityKg || dto.usageLevel) {
      await this.estimationService.getOrCreateEstimation(id);
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    const tank = await this.prisma.tank.findUnique({
      where: { id },
      include: { location: true },
    });
    if (!tank) throw new NotFoundException('Tank not found');
    if (tank.location.userId !== userId) throw new ForbiddenException();
    return this.prisma.tank.delete({ where: { id } });
  }

  async getPrediction(id: string, userId: string) {
    const tank = await this.prisma.tank.findUnique({
      where: { id },
      include: { location: true },
    });
    if (!tank) throw new NotFoundException('Tank not found');
    if (tank.location.userId !== userId) throw new ForbiddenException();

    return this.estimationService.getPrediction(id);
  }

  async adjust(id: string, userId: string, adjustment: string) {
    const tank = await this.prisma.tank.findUnique({
      where: { id },
      include: { location: true },
    });
    if (!tank) throw new NotFoundException('Tank not found');
    if (tank.location.userId !== userId) throw new ForbiddenException();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.estimation.update({
      where: { tankId: id },
      data: {
        currentAdjustment: adjustment as any,
        adjustmentExpiresAt: expiresAt,
      },
    });

    return this.estimationService.getPrediction(id);
  }
}
