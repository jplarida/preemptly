import { Elysia } from "elysia";
import { authMiddleware } from "../../lib/auth";
import { LinkingService } from "./service";
import { LinkRetailerBody } from "./model";

export const linkingModule = new Elysia({ prefix: "/link" })
  // Public route
  .get("/retailer/:code", async ({ params }) => {
    return LinkingService.resolveInviteCode(params.code);
  })
  // Protected routes
  .use(authMiddleware)
  .post("/retailer", async ({ currentUser, body }) => {
    return LinkingService.linkCustomerToRetailer(currentUser.id, body);
  }, { body: LinkRetailerBody })
  .delete("/retailer/:retailerId", async ({ currentUser, params }) => {
    return LinkingService.unlinkCustomerFromRetailer(currentUser.id, params.retailerId);
  })
  .get("/retailers", async ({ currentUser }) => {
    return LinkingService.getLinkedRetailers(currentUser.id);
  })
  .patch("/retailer/:retailerId/primary", async ({ currentUser, params }) => {
    return LinkingService.setPrimaryRetailer(currentUser.id, params.retailerId);
  });
