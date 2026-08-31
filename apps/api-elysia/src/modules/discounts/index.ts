import { Elysia } from "elysia";
import { authMiddleware } from "../../lib/auth";
import { DiscountsService } from "./service";
import { UpdateTiersBody, ToggleDiscountsBody } from "./model";

export const discountsModule = new Elysia({ prefix: "/discounts" })
  .use(authMiddleware)
  .get("/tiers", async ({ currentUser }) => {
    return DiscountsService.getRetailerTiers(currentUser.id);
  })
  .put("/tiers", async ({ currentUser, body }) => {
    return DiscountsService.updateRetailerTiers(currentUser.id, body.tiers);
  }, { body: UpdateTiersBody })
  .patch("/toggle", async ({ currentUser, body }) => {
    return DiscountsService.toggleDiscounts(currentUser.id, body.enabled);
  }, { body: ToggleDiscountsBody });
