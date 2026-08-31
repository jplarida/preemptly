import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(customerId: string, dto: CreateOrderDto) {
    // Verify customer has active link with retailer
    const link = await this.prisma.customerRetailerLink.findUnique({
      where: {
        customerId_retailerId: {
          customerId,
          retailerId: dto.retailerId,
        },
      },
    });

    if (!link || link.status !== 'ACTIVE') {
      throw new BadRequestException('No active link with this retailer');
    }

    // Verify tank belongs to customer
    const tank = await this.prisma.tank.findUnique({
      where: { id: dto.tankId },
      include: { location: true },
    });
    if (!tank) throw new NotFoundException('Tank not found');
    if (tank.location.userId !== customerId) throw new ForbiddenException();

    const order = await this.prisma.order.create({
      data: {
        tankId: dto.tankId,
        customerId,
        retailerId: dto.retailerId,
        note: dto.note,
      },
      include: {
        tank: true,
        customer: true,
        retailer: true,
      },
    });

    // Notify retailer
    await this.notificationsService.sendToRetailer(
      dto.retailerId,
      'New Order',
      `New ${tank.capacityKg}kg gas order from ${order.customer.name || order.customer.phone}`,
    );

    return order;
  }

  async findByCustomer(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { tank: true, retailer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByRetailer(retailerId: string, status?: string) {
    return this.prisma.order.findMany({
      where: {
        retailerId,
        ...(status ? { status: status as any } : {}),
      },
      include: { tank: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { tank: true, customer: true, retailer: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, retailerId: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.retailerId !== retailerId) throw new ForbiddenException();

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: { tank: true, customer: true, retailer: true },
    });

    // Notify customer
    const statusText = status === 'CONFIRMED' ? 'confirmed' : status === 'COMPLETED' ? 'completed' : 'cancelled';
    await this.notificationsService.sendToUser(
      order.customerId,
      'Order Update',
      `Your gas order has been ${statusText} by ${updated.retailer.businessName}`,
    );

    return updated;
  }
}
