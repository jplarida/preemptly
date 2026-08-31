import { prisma } from "../../lib/prisma";
import { notFound, forbidden, badRequest } from "../../lib/errors";
import { NotificationsService } from "../notifications/service";
import { DiscountsService } from "../discounts/service";
import { EstimationService } from "../estimation/service";
import { CUSTOMER_STATUS_LABELS, RETAILER_STATUS_LABELS } from "./model";

export class OrdersService {
  static async create(customerId: string, data: { tankId: string; retailerId: string; note?: string; capacityKg?: number; deliveryAddress?: string }) {
    const link = await prisma.customerRetailerLink.findUnique({
      where: { customerId_retailerId: { customerId, retailerId: data.retailerId } },
    });
    if (!link || link.status !== "ACTIVE") {
      badRequest("No active link with this retailer");
    }

    const tank = await prisma.tank.findUnique({
      where: { id: data.tankId },
      include: { location: true },
    });
    if (!tank) notFound("Tank not found");
    if (tank.location.userId !== customerId) forbidden();

    // Calculate discount at creation time
    let discountAmount = 0;
    try {
      const prediction = await EstimationService.getPrediction(tank.id);
      discountAmount = await DiscountsService.calculateDiscount(data.retailerId, prediction.estimatedRemainingDays);
    } catch {
      // No estimation available, no discount
    }

    // Get base price from retailer settings
    const capacityKg = data.capacityKg || tank.capacityKg;
    let basePrice = 0;
    const settings = await prisma.retailerSettings.findUnique({ where: { retailerId: data.retailerId } });
    if (settings?.pricing) {
      const pricing = settings.pricing as Array<{ capacityKg: number; basePrice: number }>;
      const match = pricing.find((p) => p.capacityKg === capacityKg);
      if (match) basePrice = match.basePrice;
    }

    const finalAmount = Math.max(0, basePrice - discountAmount);

    const order = await prisma.order.create({
      data: {
        tankId: data.tankId,
        customerId,
        retailerId: data.retailerId,
        note: data.note,
        status: "PENDING",
        discountAmount,
        basePrice,
        finalAmount,
        capacityKg,
        deliveryAddress: data.deliveryAddress || tank.location.address,
      },
      include: { tank: true, customer: true, retailer: true },
    });

    await NotificationsService.sendToRetailer(
      data.retailerId,
      "New Order",
      `New ${capacityKg}kg gas order from ${order.customer.name || order.customer.phone}`,
    );

    return order;
  }

  static async findByCustomer(customerId: string) {
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: { tank: true, retailer: true },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((o) => ({
      ...o,
      statusLabel: CUSTOMER_STATUS_LABELS[o.status] || o.status,
    }));
  }

  static async findByRetailer(retailerId: string, status?: string) {
    const orders = await prisma.order.findMany({
      where: {
        retailerId,
        ...(status ? { status: status as any } : {}),
      },
      include: { tank: true, customer: true },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((o) => ({
      ...o,
      statusLabel: RETAILER_STATUS_LABELS[o.status] || o.status,
    }));
  }

  static async findOne(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { tank: true, customer: true, retailer: true },
    });
    if (!order) notFound("Order not found");
    return order;
  }

  // Customer cancel (before OUT_FOR_DELIVERY)
  static async cancelByCustomer(orderId: string, customerId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) notFound("Order not found");
    if (order.customerId !== customerId) forbidden();

    const cancellableStatuses = ["PENDING", "PENDING_SMS", "CONFIRMED", "ASSIGNED"];
    if (!cancellableStatuses.includes(order.status)) {
      badRequest("Order cannot be cancelled at this stage");
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED_BY_CUSTOMER" },
      include: { retailer: true },
    });

    await NotificationsService.sendToRetailer(
      order.retailerId,
      "Order Cancelled",
      `Order has been cancelled by customer`,
    );

    return updated;
  }

  // Retailer confirm
  static async confirm(orderId: string, retailerId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) notFound("Order not found");
    if (order.retailerId !== retailerId) forbidden();
    if (order.status !== "PENDING" && order.status !== "PENDING_SMS") {
      badRequest("Order is not in pending state");
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED" },
      include: { retailer: true },
    });

    await NotificationsService.sendToUser(
      order.customerId,
      "Order Confirmed",
      `Your gas order has been confirmed by ${updated.retailer.businessName}`,
    );

    return updated;
  }

  // Retailer reject
  static async reject(orderId: string, retailerId: string, reason: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) notFound("Order not found");
    if (order.retailerId !== retailerId) forbidden();

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "REJECTED", note: reason },
      include: { retailer: true },
    });

    await NotificationsService.sendToUser(
      order.customerId,
      "Order Rejected",
      `Your gas order was rejected by ${updated.retailer.businessName}: ${reason}`,
    );

    return updated;
  }

  // Retailer assign rider
  static async assignRider(orderId: string, retailerId: string, riderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) notFound("Order not found");
    if (order.retailerId !== retailerId) forbidden();
    if (order.status !== "CONFIRMED") {
      badRequest("Order must be confirmed before assigning a rider");
    }

    const rider = await prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider || rider.retailerId !== retailerId) notFound("Rider not found");

    return prisma.order.update({
      where: { id: orderId },
      data: { status: "ASSIGNED", riderId },
      include: { tank: true, customer: true, rider: true },
    });
  }

  // Retailer override discount
  static async overrideDiscount(orderId: string, retailerId: string, discountAmount: number) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) notFound("Order not found");
    if (order.retailerId !== retailerId) forbidden();

    const finalAmount = Math.max(0, order.basePrice - discountAmount);

    return prisma.order.update({
      where: { id: orderId },
      data: { discountAmount, finalAmount },
    });
  }

  // Retailer cancel
  static async cancelByRetailer(orderId: string, retailerId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) notFound("Order not found");
    if (order.retailerId !== retailerId) forbidden();

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED_BY_RETAILER" },
    });

    await NotificationsService.sendToUser(
      order.customerId,
      "Order Cancelled",
      "Your gas order has been cancelled by the retailer",
    );

    return updated;
  }

  // Manual order entry (SMS/call/walk-in)
  static async createManual(retailerId: string, data: { customerPhone: string; capacityKg: number; note?: string; source?: string }) {
    // Find customer by phone
    const customer = await prisma.user.findUnique({ where: { phone: data.customerPhone } });

    // Find customer's tank (best effort)
    let tankId: string | null = null;
    if (customer) {
      const tank = await prisma.tank.findFirst({
        where: {
          location: { userId: customer.id },
          isActive: true,
          capacityKg: data.capacityKg,
        },
      });
      tankId = tank?.id || null;
    }

    // If no tank found, we still need a tankId - create a placeholder or use first active tank
    if (!tankId && customer) {
      const anyTank = await prisma.tank.findFirst({
        where: { location: { userId: customer.id }, isActive: true },
      });
      tankId = anyTank?.id || null;
    }

    if (!tankId || !customer) {
      // Create order with minimal info - customer may not be in system
      badRequest("Customer not found in system. Please register the customer first.");
    }

    return prisma.order.create({
      data: {
        tankId: tankId,
        customerId: customer.id,
        retailerId,
        status: "CONFIRMED",
        note: data.note || `Manual order via ${data.source || "WALK_IN"}`,
        capacityKg: data.capacityKg,
        basePrice: 0,
        discountAmount: 0,
        finalAmount: 0,
      },
      include: { tank: true, customer: true },
    });
  }

  // Mark delivered - triggers side effects
  static async markDelivered(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { tank: true },
    });
    if (!order) notFound("Order not found");

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        paymentStatus: "COLLECTED",
      },
    });

    // Side effects on delivery
    // 1. Reset estimation (log refill)
    if (order.tankId) {
      try {
        await prisma.tank.update({
          where: { id: order.tankId },
          data: { lastRefillDate: new Date() },
        });

        // Create refill log
        const lastRefill = order.tank.lastRefillDate;
        const actualCycleDays = Math.floor(
          (Date.now() - lastRefill.getTime()) / (1000 * 60 * 60 * 24),
        );

        await prisma.refillLog.create({
          data: {
            tankId: order.tankId,
            refillDate: new Date(),
            actualCycleDays: actualCycleDays > 0 ? actualCycleDays : null,
          },
        });

        await EstimationService.recalculateAfterRefill(order.tankId);
      } catch {
        // Non-critical, log and continue
        console.error(`Failed to update estimation for tank ${order.tankId}`);
      }
    }

    await NotificationsService.sendToUser(
      order.customerId,
      "Order Delivered",
      "Your gas order has been delivered!",
    );

    return updated;
  }
}
