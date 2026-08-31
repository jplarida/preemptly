import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkRetailerDto } from './dto/link-retailer.dto';

@Injectable()
export class LinkingService {
  constructor(private prisma: PrismaService) {}

  async resolveInviteCode(code: string) {
    const retailer = await this.prisma.retailer.findUnique({
      where: { inviteCode: code },
    });

    if (!retailer || !retailer.isActive) {
      throw new NotFoundException('Invalid or inactive invite code');
    }

    // Track click
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.inviteStat.upsert({
      where: {
        retailerId_date: { retailerId: retailer.id, date: today },
      },
      update: { linkClicks: { increment: 1 } },
      create: { retailerId: retailer.id, date: today, linkClicks: 1 },
    });

    return {
      id: retailer.id,
      businessName: retailer.businessName,
      city: retailer.city,
    };
  }

  async linkCustomerToRetailer(customerId: string, dto: LinkRetailerDto) {
    const retailer = await this.prisma.retailer.findUnique({
      where: { inviteCode: dto.code },
    });

    if (!retailer || !retailer.isActive) {
      throw new NotFoundException('Invalid or inactive invite code');
    }

    // Check for existing link
    const existing = await this.prisma.customerRetailerLink.findUnique({
      where: {
        customerId_retailerId: {
          customerId,
          retailerId: retailer.id,
        },
      },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new ConflictException('Already linked to this retailer');
      }
      // Reactivate
      return this.prisma.customerRetailerLink.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', linkedVia: dto.method as any },
      });
    }

    const link = await this.prisma.customerRetailerLink.create({
      data: {
        customerId,
        retailerId: retailer.id,
        linkedVia: dto.method as any,
        status: 'ACTIVE',
      },
    });

    // Track join
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.inviteStat.upsert({
      where: {
        retailerId_date: { retailerId: retailer.id, date: today },
      },
      update: { joins: { increment: 1 } },
      create: { retailerId: retailer.id, date: today, joins: 1 },
    });

    return link;
  }

  async unlinkCustomerFromRetailer(customerId: string, retailerId: string) {
    const link = await this.prisma.customerRetailerLink.findUnique({
      where: {
        customerId_retailerId: { customerId, retailerId },
      },
    });

    if (!link) throw new NotFoundException('Link not found');

    return this.prisma.customerRetailerLink.update({
      where: { id: link.id },
      data: { status: 'INACTIVE' },
    });
  }

  async getLinkedRetailers(customerId: string) {
    const links = await this.prisma.customerRetailerLink.findMany({
      where: { customerId, status: 'ACTIVE' },
      include: { retailer: true },
    });

    return links.map((l) => ({
      linkId: l.id,
      retailer: {
        id: l.retailer.id,
        businessName: l.retailer.businessName,
        city: l.retailer.city,
        phone: l.retailer.phone,
        address: l.retailer.address,
      },
      linkedDate: l.createdAt.toISOString(),
    }));
  }
}
