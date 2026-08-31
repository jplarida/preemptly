import { Elysia } from "elysia";
import { authMiddleware } from "../../lib/auth";
import { NotificationsService } from "./service";
import { RegisterTokenBody } from "./model";

export const notificationsModule = new Elysia({ prefix: "/notifications" })
  .use(authMiddleware)
  .post("/device-token", async ({ currentUser, body }) => {
    return NotificationsService.registerDeviceToken(currentUser.id, body.token, body.platform);
  }, { body: RegisterTokenBody })
  .delete("/device-token/:token", async ({ params }) => {
    return NotificationsService.removeDeviceToken(params.token);
  });
