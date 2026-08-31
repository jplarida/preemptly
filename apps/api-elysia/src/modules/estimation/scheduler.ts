import { Elysia } from "elysia";
import { cron } from "@elysiajs/cron";
import { prisma } from "../../lib/prisma";
import { EstimationService } from "./service";
import { NotificationsService } from "../notifications/service";

export const estimationScheduler = new Elysia({ name: "estimation-scheduler" }).use(
  cron({
    name: "low-gas-alerts",
    pattern: "0 0 * * *", // Daily at midnight UTC (8 AM Manila)
    async run() {
      console.log("[scheduler] Running low gas alert check...");

      const activeTanks = await prisma.tank.findMany({
        where: { isActive: true },
        include: {
          location: {
            include: { user: true },
          },
          // Get all linked retailers for this customer
        },
      });

      for (const tank of activeTanks) {
        try {
          const prediction = await EstimationService.getPrediction(tank.id);

          // Get retailer-specific preemptly zone threshold
          // Find the primary retailer link for this user
          const primaryLink = await prisma.customerRetailerLink.findFirst({
            where: {
              customerId: tank.location.userId,
              status: "ACTIVE",
              isPrimary: true,
            },
          });

          let threshold = 5; // default
          if (primaryLink) {
            const settings = await prisma.retailerSettings.findUnique({
              where: { retailerId: primaryLink.retailerId },
            });
            if (settings?.preemptlyZoneDays) {
              threshold = settings.preemptlyZoneDays;
            }
          }

          const isLowByDays = prediction.estimatedRemainingDays <= threshold;
          const isLowByPercentage =
            prediction.estimatedTotalDays > 0 &&
            prediction.estimatedRemainingDays / prediction.estimatedTotalDays <= 0.15;

          if (isLowByDays || isLowByPercentage) {
            await NotificationsService.sendToUser(
              tank.location.user.id,
              "Gas Running Low",
              `Your ${tank.capacityKg}kg tank has approximately ${prediction.estimatedRemainingDays} days remaining. Consider ordering a refill soon.`,
            );
          }
        } catch (error) {
          console.error(`[scheduler] Error checking tank ${tank.id}:`, error);
        }
      }

      console.log("[scheduler] Low gas alert check completed.");
    },
  }),
);
