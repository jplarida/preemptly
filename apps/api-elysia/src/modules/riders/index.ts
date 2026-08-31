import { Elysia } from "elysia";
import { authMiddleware } from "../../lib/auth";
import { RidersService } from "./service";
import { RegisterCustomerBody, ConfirmDeliveryBody } from "./model";

export const ridersModule = new Elysia({ prefix: "/rider" })
  .use(authMiddleware)
  .get("/deliveries", async ({ currentUser }) => {
    return RidersService.getDeliveries(currentUser.id);
  })
  .get("/prospects", async ({ currentUser }) => {
    return RidersService.getProspects(currentUser.id);
  })
  .post("/customers", async ({ currentUser, body }) => {
    return RidersService.registerCustomer(currentUser.id, body);
  }, { body: RegisterCustomerBody })
  .post("/deliveries/:id/start", async ({ currentUser, params }) => {
    return RidersService.startDelivery(currentUser.id, params.id);
  })
  .post("/deliveries/:id/confirm", async ({ currentUser, params, body }) => {
    return RidersService.confirmDelivery(currentUser.id, params.id, body.method, body.code);
  }, { body: ConfirmDeliveryBody })
  .get("/history", async ({ currentUser }) => {
    return RidersService.getHistory(currentUser.id);
  });
