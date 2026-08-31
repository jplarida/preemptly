import { Elysia } from "elysia";
import { authMiddleware } from "../../lib/auth";
import { RetailersService } from "./service";
import { RegisterRetailerBody, UpdateRetailerBody, PricingBody, PreemptlyZoneBody, CreateRiderBody } from "./model";

export const retailersModule = new Elysia({ prefix: "/retailers" })
  .post("/register", async ({ body }) => {
    return RetailersService.register(body);
  }, { body: RegisterRetailerBody })
  .use(authMiddleware)
  .get("/me", async ({ currentUser }) => {
    return RetailersService.getProfile(currentUser.id);
  })
  .patch("/me", async ({ currentUser, body }) => {
    return RetailersService.updateProfile(currentUser.id, body);
  }, { body: UpdateRetailerBody })
  .get("/me/dashboard", async ({ currentUser }) => {
    return RetailersService.getDashboard(currentUser.id);
  })
  .get("/me/customers", async ({ currentUser }) => {
    return RetailersService.getCustomersWithStatus(currentUser.id);
  })
  .get("/me/orders", async ({ currentUser, query }) => {
    return RetailersService.getOrders(currentUser.id, query.status);
  })
  .get("/me/invite-stats", async ({ currentUser }) => {
    return RetailersService.getInviteStats(currentUser.id);
  })
  .put("/me/pricing", async ({ currentUser, body }) => {
    return RetailersService.updatePricing(currentUser.id, body.prices);
  }, { body: PricingBody })
  .put("/me/preemptly-zone", async ({ currentUser, body }) => {
    return RetailersService.updatePreemptlyZone(currentUser.id, body.preemptlyZoneDays);
  }, { body: PreemptlyZoneBody })
  .get("/me/riders", async ({ currentUser }) => {
    return RetailersService.getRiders(currentUser.id);
  })
  .post("/me/riders", async ({ currentUser, body }) => {
    return RetailersService.createRider(currentUser.id, body);
  }, { body: CreateRiderBody })
  .delete("/me/riders/:id", async ({ currentUser, params }) => {
    return RetailersService.removeRider(currentUser.id, params.id);
  });
