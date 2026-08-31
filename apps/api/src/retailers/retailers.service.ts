import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstimationService } from '../estimation/estimation.service';
import { RegisterRetailerDto } from './dto/register-retailer.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class RetailersService {
  constructor(
    private prisma: PrismaService,
    private estimationService: EstimationService,
  ) {}

  private generateInviteCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  async register(dto: RegisterRetailerDto) {
    const existing = await this.prisma.retailer.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) throw new ConflictException('Phone number already registered as retailer');

    const inviteCode = this.generateInviteCode();
    const inviteLink = `app.preemptly.com/join/${inviteCode}`;

    return this.prisma.retailer.create({
      data: {
        businessName: dto.businessName,
        ownerName: dto.ownerName,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        inviteCode,
        inviteLink,
      },
    });
  }

  async getProfile(retailerId: string) {
    const retailer = await this.prisma.retailer.findUnique({
      where: { id: retailerId },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');
    return retailer;
  }

  async updateProfile(retailerId: string, data: Partial<RegisterRetailerDto>) {
    return this.prisma.retailer.update({
      where: { id: retailerId },
      data,
    });
  }

  async getDashboard(retailerId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [customerCount, pendingOrders, newThisMonth, customers] = await Promise.all([
      this.prisma.customerRetailerLink.count({
        where: { retailerId, status: 'ACTIVE' },
      }),
      this.prisma.order.count({
        where: { retailerId, status: 'PENDING' },
      }),
      this.prisma.customerRetailerLink.count({
        where: { retailerId, status: 'ACTIVE', createdAt: { gte: startOfMonth } },
      }),
      this.getCustomersWithStatus(retailerId),
    ]);

    const runningLowCount = customers.filter((c) => c.status === 'running_low').length;

    return { customerCount, pendingOrders, runningLowCount, newThisMonth };
  }

  async getCustomersWithStatus(retailerId: string) {
    const links = await this.prisma.customerRetailerLink.findMany({
      where: { retailerId, status: 'ACTIVE' },
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
      orderBy: { createdAt: 'desc' },
    });

    const results: Array<{
      id: string;
      name: string | null;
      phone: string;
      tankCapacityKg: number | null;
      status: 'running_low' | 'okay' | 'new';
      daysRemaining: number | null;
      displayRange: { low: number; high: number } | null;
      lastRefillDate: string | null;
      linkedDate: string;
    }> = [];
    for (const link of links) {
      const user = link.customer;
      const tank = user.locations[0]?.tanks[0];

      let status: 'running_low' | 'okay' | 'new' = 'new';
      let daysRemaining: number | null = null;
      let displayRange: { low: number; high: number } | null = null;

      if (tank) {
        try {
          const prediction = await this.estimationService.getPrediction(tank.id);
          daysRemaining = prediction.estimatedRemainingDays;
          displayRange = prediction.displayRange;
          status = prediction.estimatedRemainingDays <= 5 ? 'running_low' : 'okay';
        } catch {
          status = 'new';
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

  async getOrders(retailerId: string, status?: string) {
    return this.prisma.order.findMany({
      where: {
        retailerId,
        ...(status ? { status: status as any } : {}),
      },
      include: { tank: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInviteStats(retailerId: string) {
    const stats = await this.prisma.inviteStat.findMany({
      where: { retailerId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    const totalClicks = stats.reduce((sum, s) => sum + s.linkClicks, 0);
    const totalJoins = stats.reduce((sum, s) => sum + s.joins, 0);

    return {
      totalClicks,
      totalJoins,
      dailyStats: stats.map((s) => ({
        date: s.date.toISOString().split('T')[0],
        clicks: s.linkClicks,
        joins: s.joins,
      })),
    };
  }
}
