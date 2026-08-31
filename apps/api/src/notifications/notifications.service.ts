import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async sendToUser(userId: string, title: string, body: string) {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) {
      this.logger.log(`[DEV] No device tokens for user ${userId}. Notification: ${title} - ${body}`);
      return;
    }

    // In production, use Firebase Admin SDK to send push notifications
    // For MVP, just log
    for (const token of tokens) {
      this.logger.log(`[DEV] Push to ${token.platform}/${token.token.slice(0, 10)}...: ${title} - ${body}`);
    }
  }

  async sendToRetailer(retailerId: string, title: string, body: string) {
    // Retailers use the web dashboard, so we log for now
    // In production, could use web push or SMS
    this.logger.log(`[DEV] Retailer ${retailerId} notification: ${title} - ${body}`);
  }

  async registerDeviceToken(userId: string, token: string, platform: string) {
    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  async removeDeviceToken(token: string) {
    return this.prisma.deviceToken.deleteMany({ where: { token } });
  }
}
