import { Elysia } from "elysia";
import { authMiddleware } from "../../lib/auth";
import { RefillsService } from "./service";
import { LogRefillBody } from "./model";

export const refillsModule = new Elysia({ prefix: "/refills" })
  .use(authMiddleware)
  .post("/", async ({ currentUser, body }) => {
    return RefillsService.logRefill(currentUser.id, body);
  }, { body: LogRefillBody })
  .get("/tank/:tankId", async ({ currentUser, params }) => {
    return RefillsService.getHistory(params.tankId, currentUser.id);
  })
  .patch("/:id/confirm", async ({ currentUser, params }) => {
    return RefillsService.confirmOutlier(params.id, currentUser.id);
  });
