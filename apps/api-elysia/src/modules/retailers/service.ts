import { prisma } from "../../lib/prisma";
import { notFound, conflict } from "../../lib/errors";
import { EstimationService } from "../estimation/service";
import { randomBytes } from "crypto";

export class RetailersService {
  private static generateInviteCode(): string {
    return randomBytes(4).toString("hex").toUpperCase();
  }

  static async register(data: { businessName: string; ownerName: string; phone: string; address: string; city: string }) {
    const existing = await prisma.retailer.findUnique({ where: { phone: data.phone } });
    if (existing) conflict("Phone number already registered as retailer");

    const inviteCode = this.generateInviteCode();
    const inviteLink = `app.preemptly.com/join/${inviteCode}`;

    return prisma.retailer.create({
      data: { ...data, inviteCode, inviteLink },
    });
  }

  static async getProfile(retailerId: string) {
    const retailer = await prisma.retailer.findUnique({ where: { id: retailerId } });
    if (!retailer) notFound("Retailer not found");
    return retailer;
  }

  static async updateProfile(retailerId: string, data: { businessName?: string; ownerName?: string; address?: string; city?: string }) {
    return prisma.retailer.update({ where: { id: retailerId }, data });
  }

  static async getDashboard(retailerId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [customerCount, pendingOrders, newThisMonth, customers] = await Promise.all([
      prisma.customerRetailerLink.count({ where: { retailerId, status: "ACTIVE" } }),
      prisma.order.count({ where: { retailerId, status: "PENDING" } }),
      prisma.customerRetailerLink.count({ where: { retailerId, status: "ACTIVE", createdAt: { gte: startOfMonth } } }),
      this.getCustomersWithStatus(retailerId),
    ]);

    const runningLowCount = customers.filter((c) => c.status === "running_low").length;
    return { customerCount, pendingOrders, runningLowCount, newThisMonth };
  }

  static async getCustomersWithStatus(retailerId: string) {
    const settings = await prisma.retailerSettings.findUnique({ where: { retailerId } });
    const preemptlyZone = settings?.preemptlyZoneDays || 5;

    const links = await prisma.customerRetailerLink.findMany({
      where: { retailerId, status: "ACTIVE" },
      include: {
        customer: {
          include: {
            locations: {
              include: {
                tanks: {
                  where: { isActive: true },
                  include: { estimation: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const results: Array<{
      id: string;
      name: string | null;
      phone: string;
      tankCapacityKg: number | null;
      status: "running_low" | "okay" | "new";
      daysRemaining: number | null;
      displayRange: { low: number; high: number } | null;
      lastRefillDate: string | null;
      linkedDate: string;
    }> = [];

    for (const link of links) {
      const user = link.customer;
      const tank = user.locations[0]?.tanks[0];

      let status: "running_low" | "okay" | "new" = "new";
      let daysRemaining: number | null = null;
      let displayRange: { low: number; high: number } | null = null;

      if (tank) {
        try {
          const prediction = await EstimationService.getPrediction(tank.id);
          daysRemaining = prediction.estimatedRemainingDays;
          displayRange = prediction.displayRange;
          status = prediction.estimatedRemainingDays <= preemptlyZone ? "running_low" : "okay";
        } catch {
          status = "new";
        }
      }

      results.push({
        id: user.id,
        name: user.name,
        phone: user.phone,
        tankCapacityKg: tank?.capacityKg || null,
        status,
        daysRemaining,
        displayRange,
        lastRefillDate: tank?.lastRefillDate?.toISOString() || null,
        linkedDate: link.createdAt.toISOString(),
      });
    }

    return results;
  }

  static async getOrders(retailerId: string, status?: string) {
    return prisma.order.findMany({
      where: {
        retailerId,
        ...(status ? { status: status as any } : {}),
      },
      include: { tank: true, customer: true },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getInviteStats(retailerId: string) {
    const stats = await prisma.inviteStat.findMany({
      where: { retailerId },
      orderBy: { date: "desc" },
      take: 30,
    });

    const totalClicks = stats.reduce((sum, s) => sum + s.linkClicks, 0);
    const totalJoins = stats.reduce((sum, s) => sum + s.joins, 0);

    return {
      totalClicks,
      totalJoins,
      dailyStats: stats.map((s) => ({
        date: s.date.toISOString().split("T")[0],
        clicks: s.linkClicks,
        joins: s.joins,
      })),
    };
  }

  static async updatePricing(retailerId: string, prices: Array<{ capacityKg: number; basePrice: number }>) {
    return prisma.retailerSettings.upsert({
      where: { retailerId },
      update: { pricing: prices as any },
      create: {
        retailerId,
        pricing: prices as any,
        discountTiers: [] as any,
        preemptlyZoneDays: 5,
        discountsEnabled: true,
      },
    });
  }

  static async updatePreemptlyZone(retailerId: string, days: number) {
    return prisma.retailerSettings.upsert({
      where: { retailerId },
      update: { preemptlyZoneDays: days },
      create: {
        retailerId,
        preemptlyZoneDays: days,
        discountTiers: [] as any,
        discountsEnabled: true,
      },
    });
  }

  static async getRiders(retailerId: string) {
    return prisma.rider.findMany({
      where: { retailerId, isActive: true },
    });
  }

  static async createRider(retailerId: string, data: { name: string; phone: string }) {
    return prisma.rider.create({
      data: {
        retailerId,
        name: data.name,
        phone: data.phone,
      },
    });
  }

  static async removeRider(retailerId: string, riderId: string) {
    const rider = await prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider || rider.retailerId !== retailerId) notFound("Rider not found");

    return prisma.rider.update({
      where: { id: riderId },
      data: { isActive: false },
    });
  }
}
