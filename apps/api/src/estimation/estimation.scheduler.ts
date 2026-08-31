import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EstimationService } from './estimation.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EstimationScheduler {
  private readonly logger = new Logger(EstimationScheduler.name);

  constructor(
    private prisma: PrismaService,
    private estimationService: EstimationService,
    private notificationsService: NotificationsService,
  ) {}

  // Run daily at 8:00 AM Manila time (0:00 UTC)
  @Cron('0 0 * * *')
  async checkLowGasAlerts() {
    this.logger.log('Running low gas alert check...');

    const activeTanks = await this.prisma.tank.findMany({
      where: { isActive: true },
      include: { location: { include: { user: true } } },
    });

    for (const tank of activeTanks) {
      try {
        const prediction = await this.estimationService.getPrediction(tank.id);

        const isLowByDays = prediction.estimatedRemainingDays <= 5;
        const isLowByPercentage =
          prediction.estimatedTotalDays > 0 &&
          prediction.estimatedRemainingDays / prediction.estimatedTotalDays <= 0.15;

        if (isLowByDays || isLowByPercentage) {
          await this.notificationsService.sendToUser(
            tank.location.user.id,
            'Gas Running Low',
            `Your ${tank.capacityKg}kg tank has approximately ${prediction.estimatedRemainingDays} days remaining. Consider ordering a refill soon.`,
          );
        }
      } catch (error) {
        this.logger.error(`Error checking tank ${tank.id}:`, error);
      }
    }
  }
}
