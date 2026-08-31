import { prisma } from "../../lib/prisma";

export class NotificationsService {
  static async sendToUser(userId: string, title: string, body: string) {
    const tokens = await prisma.deviceToken.findMany({ where: { userId } });

    if (tokens.length === 0) {
      console.log(`[DEV] No device tokens for user ${userId}. Notification: ${title} - ${body}`);
      return;
    }

    for (const token of tokens) {
      console.log(`[DEV] Push to ${token.platform}/${token.token.slice(0, 10)}...: ${title} - ${body}`);
    }
  }

  static async sendToRetailer(retailerId: string, title: string, body: string) {
    console.log(`[DEV] Retailer ${retailerId} notification: ${title} - ${body}`);
  }

  static async registerDeviceToken(userId: string, token: string, platform: string) {
    return prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  static async removeDeviceToken(token: string) {
    return prisma.deviceToken.deleteMany({ where: { token } });
  }
}
