import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/errors";
import { DEFAULT_DISCOUNT_TIERS, DEFAULT_PREEMPTLY_ZONE_DAYS } from "./model";

export interface DiscountTier {
  daysBeforeEmpty: number;
  discountAmount: number;
}

export class DiscountsService {
  static async calculateDiscount(retailerId: string, estimatedDaysRemaining: number): Promise<number> {
    const settings = await prisma.retailerSettings.findUnique({
      where: { retailerId },
    });

    if (!settings || !settings.discountsEnabled) return 0;

    const tiers: DiscountTier[] = (settings.discountTiers as unknown as DiscountTier[]) || DEFAULT_DISCOUNT_TIERS;
    const preemptlyZone = settings.preemptlyZoneDays || DEFAULT_PREEMPTLY_ZONE_DAYS;

    if (estimatedDaysRemaining > preemptlyZone) return 0;

    // Find matching tier (sorted by daysBeforeEmpty desc)
    const sortedTiers = [...tiers].sort((a, b) => b.daysBeforeEmpty - a.daysBeforeEmpty);
    for (const tier of sortedTiers) {
      if (estimatedDaysRemaining <= tier.daysBeforeEmpty) {
        return tier.discountAmount;
      }
    }

    return 0;
  }

  static async getRetailerTiers(retailerId: string) {
    const settings = await prisma.retailerSettings.findUnique({
      where: { retailerId },
    });

    return {
      tiers: (settings?.discountTiers as unknown as DiscountTier[]) || DEFAULT_DISCOUNT_TIERS,
      preemptlyZoneDays: settings?.preemptlyZoneDays || DEFAULT_PREEMPTLY_ZONE_DAYS,
      discountsEnabled: settings?.discountsEnabled ?? true,
    };
  }

  static async updateRetailerTiers(retailerId: string, tiers: DiscountTier[]) {
    const retailer = await prisma.retailer.findUnique({ where: { id: retailerId } });
    if (!retailer) notFound("Retailer not found");

    return prisma.retailerSettings.upsert({
      where: { retailerId },
      update: { discountTiers: tiers as any },
      create: {
        retailerId,
        discountTiers: tiers as any,
        preemptlyZoneDays: DEFAULT_PREEMPTLY_ZONE_DAYS,
        discountsEnabled: true,
      },
    });
  }

  static async toggleDiscounts(retailerId: string, enabled: boolean) {
    return prisma.retailerSettings.upsert({
      where: { retailerId },
      update: { discountsEnabled: enabled },
      create: {
        retailerId,
        discountTiers: DEFAULT_DISCOUNT_TIERS as any,
        preemptlyZoneDays: DEFAULT_PREEMPTLY_ZONE_DAYS,
        discountsEnabled: enabled,
      },
    });
  }
}
