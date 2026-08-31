import { prisma } from "../../lib/prisma";
import { notFound, forbidden, badRequest } from "../../lib/errors";
import { EstimationService } from "../estimation/service";
import { OrdersService } from "../orders/service";

export class RidersService {
  // Today's assigned deliveries
  static async getDeliveries(riderId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.order.findMany({
      where: {
        riderId,
        status: { in: ["ASSIGNED", "OUT_FOR_DELIVERY"] },
        updatedAt: { gte: today },
      },
      include: { tank: true, customer: true, retailer: true },
      orderBy: { createdAt: "asc" },
    });
  }

  // Customers in preemptly zone sorted by urgency
  static async getProspects(riderId: string) {
    const rider = await prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) notFound("Rider not found");

    const settings = await prisma.retailerSettings.findUnique({
      where: { retailerId: rider.retailerId },
    });
    const preemptlyZone = settings?.preemptlyZoneDays || 5;

    const links = await prisma.customerRetailerLink.findMany({
      where: { retailerId: rider.retailerId, status: "ACTIVE" },
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
    });

    const prospects: Array<{
      customerId: string;
      name: string | null;
      phone: string;
      address: string | null;
      capacityKg: number | null;
      daysRemaining: number;
      urgency: "critical" | "soon" | "approaching";
    }> = [];

    for (const link of links) {
      const tank = link.customer.locations[0]?.tanks[0];
      if (!tank) continue;

      try {
        const prediction = await EstimationService.getPrediction(tank.id);
        if (prediction.estimatedRemainingDays <= preemptlyZone) {
          let urgency: "critical" | "soon" | "approaching" = "approaching";
          if (prediction.estimatedRemainingDays <= 1) urgency = "critical";
          else if (prediction.estimatedRemainingDays <= 3) urgency = "soon";

          prospects.push({
            customerId: link.customer.id,
            name: link.customer.name,
            phone: link.customer.phone,
            address: link.customer.locations[0]?.address || null,
            capacityKg: tank.capacityKg,
            daysRemaining: prediction.estimatedRemainingDays,
            urgency,
          });
        }
      } catch {
        // Skip customers without estimations
      }
    }

    // Sort by urgency (most urgent first)
    return prospects.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  // First delivery customer registration
  static async registerCustomer(
    riderId: string,
    data: { name: string; phone: string; address: string; locationType?: string; capacityKg: number; usageLevel?: string },
  ) {
    const rider = await prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) notFound("Rider not found");

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (!user) {
      user = await prisma.user.create({ data: { phone: data.phone, name: data.name } });
    }

    // Create location
    const location = await prisma.location.create({
      data: {
        userId: user.id,
        address: data.address,
        type: (data.locationType as any) || "HOME",
      },
    });

    // Create tank
    const tank = await prisma.tank.create({
      data: {
        locationId: location.id,
        capacityKg: data.capacityKg,
        usageLevel: (data.usageLevel as any) || "MODERATE",
        lastRefillDate: new Date(),
      },
    });

    // Create estimation
    await EstimationService.getOrCreateEstimation(tank.id);

    // Link customer to retailer
    await prisma.customerRetailerLink.upsert({
      where: {
        customerId_retailerId: { customerId: user.id, retailerId: rider.retailerId },
      },
      update: { status: "ACTIVE" },
      create: {
        customerId: user.id,
        retailerId: rider.retailerId,
        linkedVia: "QR_CODE",
        status: "ACTIVE",
      },
    });

    return { user, location, tank };
  }

  // Start delivery
  static async startDelivery(riderId: string, orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) notFound("Order not found");
    if (order.riderId !== riderId) forbidden();
    if (order.status !== "ASSIGNED") {
      badRequest("Order must be assigned before starting delivery");
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status: "OUT_FOR_DELIVERY" },
      include: { tank: true, customer: true },
    });
  }

  // Confirm delivery (QR/code/manual)
  static async confirmDelivery(riderId: string, orderId: string, method: string, code?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) notFound("Order not found");
    if (order.riderId !== riderId) forbidden();
    if (order.status !== "OUT_FOR_DELIVERY") {
      badRequest("Order must be out for delivery to confirm");
    }

    // For MANUAL method, flag for retailer review
    const needsReview = method === "MANUAL";

    await prisma.order.update({
      where: { id: orderId },
      data: {
        confirmationMethod: method,
        confirmationCode: code || null,
        needsReview,
      },
    });

    return OrdersService.markDelivered(orderId);
  }

  // Delivery history
  static async getHistory(riderId: string) {
    return prisma.order.findMany({
      where: {
        riderId,
        status: "DELIVERED",
      },
      include: { tank: true, customer: true },
      orderBy: { deliveredAt: "desc" },
      take: 50,
    });
  }
}
