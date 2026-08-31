import { prisma } from "../../lib/prisma";
import { notFound, conflict } from "../../lib/errors";

export class LinkingService {
  static async resolveInviteCode(code: string) {
    const retailer = await prisma.retailer.findUnique({ where: { inviteCode: code } });
    if (!retailer || !retailer.isActive) {
      notFound("Invalid or inactive invite code");
    }

    // Track click
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.inviteStat.upsert({
      where: { retailerId_date: { retailerId: retailer.id, date: today } },
      update: { linkClicks: { increment: 1 } },
      create: { retailerId: retailer.id, date: today, linkClicks: 1 },
    });

    return {
      id: retailer.id,
      businessName: retailer.businessName,
      city: retailer.city,
    };
  }

  static async linkCustomerToRetailer(customerId: string, data: { code: string; method: string }) {
    const retailer = await prisma.retailer.findUnique({ where: { inviteCode: data.code } });
    if (!retailer || !retailer.isActive) {
      notFound("Invalid or inactive invite code");
    }

    const existing = await prisma.customerRetailerLink.findUnique({
      where: { customerId_retailerId: { customerId, retailerId: retailer.id } },
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        conflict("Already linked to this retailer");
      }
      // Reactivate
      const link = await prisma.customerRetailerLink.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", linkedVia: data.method as any },
      });

      // Track join
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.inviteStat.upsert({
        where: { retailerId_date: { retailerId: retailer.id, date: today } },
        update: { joins: { increment: 1 } },
        create: { retailerId: retailer.id, date: today, joins: 1 },
      });

      return link;
    }

    // Check if this is the first retailer (auto-set as primary)
    const existingLinks = await prisma.customerRetailerLink.count({
      where: { customerId, status: "ACTIVE" },
    });
    const isPrimary = existingLinks === 0;

    const link = await prisma.customerRetailerLink.create({
      data: {
        customerId,
        retailerId: retailer.id,
        linkedVia: data.method as any,
        status: "ACTIVE",
        isPrimary,
      },
    });

    // Track join
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.inviteStat.upsert({
      where: { retailerId_date: { retailerId: retailer.id, date: today } },
      update: { joins: { increment: 1 } },
      create: { retailerId: retailer.id, date: today, joins: 1 },
    });

    return link;
  }

  static async unlinkCustomerFromRetailer(customerId: string, retailerId: string) {
    const link = await prisma.customerRetailerLink.findUnique({
      where: { customerId_retailerId: { customerId, retailerId } },
    });
    if (!link) notFound("Link not found");

    const updated = await prisma.customerRetailerLink.update({
      where: { id: link.id },
      data: { status: "INACTIVE", isPrimary: false },
    });

    // If this was primary, set next active link as primary
    if (link.isPrimary) {
      const nextLink = await prisma.customerRetailerLink.findFirst({
        where: { customerId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      });
      if (nextLink) {
        await prisma.customerRetailerLink.update({
          where: { id: nextLink.id },
          data: { isPrimary: true },
        });
      }
    }

    return updated;
  }

  static async getLinkedRetailers(customerId: string) {
    const links = await prisma.customerRetailerLink.findMany({
      where: { customerId, status: "ACTIVE" },
      include: { retailer: true },
    });

    return links.map((l) => ({
      linkId: l.id,
      isPrimary: l.isPrimary,
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

  static async setPrimaryRetailer(customerId: string, retailerId: string) {
    const link = await prisma.customerRetailerLink.findUnique({
      where: { customerId_retailerId: { customerId, retailerId } },
    });
    if (!link || link.status !== "ACTIVE") notFound("Active link not found");

    // Unset all primary flags for this customer
    await prisma.customerRetailerLink.updateMany({
      where: { customerId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set the selected one as primary
    return prisma.customerRetailerLink.update({
      where: { id: link.id },
      data: { isPrimary: true },
    });
  }
}
