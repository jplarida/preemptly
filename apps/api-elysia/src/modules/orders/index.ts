import { Elysia } from "elysia";
import { authMiddleware } from "../../lib/auth";
import { OrdersService } from "./service";
import {
  CreateOrderBody,
  ManualOrderBody,
  RejectOrderBody,
  AssignRiderBody,
  OverrideDiscountBody,
} from "./model";

export const ordersModule = new Elysia({ prefix: "/orders" })
  .use(authMiddleware)
  // Customer endpoints
  .post("/", async ({ currentUser, body }) => {
    return OrdersService.create(currentUser.id, body);
  }, { body: CreateOrderBody })
  .get("/", async ({ currentUser, query }) => {
    if (currentUser.role === "retailer") {
      return OrdersService.findByRetailer(currentUser.id, query.status);
    }
    return OrdersService.findByCustomer(currentUser.id);
  })
  .get("/:id", async ({ params }) => {
    return OrdersService.findOne(params.id);
  })
  .patch("/:id/cancel", async ({ currentUser, params }) => {
    return OrdersService.cancelByCustomer(params.id, currentUser.id);
  })
  // Retailer endpoints
  .patch("/:id/confirm", async ({ currentUser, params }) => {
    return OrdersService.confirm(params.id, currentUser.id);
  })
  .patch("/:id/reject", async ({ currentUser, params, body }) => {
    return OrdersService.reject(params.id, currentUser.id, (body as any).reason);
  }, { body: RejectOrderBody })
  .patch("/:id/assign", async ({ currentUser, params, body }) => {
    return OrdersService.assignRider(params.id, currentUser.id, (body as any).riderId);
  }, { body: AssignRiderBody })
  .patch("/:id/discount", async ({ currentUser, params, body }) => {
    return OrdersService.overrideDiscount(params.id, currentUser.id, (body as any).discountAmount);
  }, { body: OverrideDiscountBody })
  .post("/manual", async ({ currentUser, body }) => {
    return OrdersService.createManual(currentUser.id, body);
  }, { body: ManualOrderBody });
