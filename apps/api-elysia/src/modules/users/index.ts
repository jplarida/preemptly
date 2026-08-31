import { Elysia } from "elysia";
import { authMiddleware } from "../../lib/auth";
import { UsersService } from "./service";
import { UpdateUserBody } from "./model";

export const usersModule = new Elysia({ prefix: "/users" })
  .use(authMiddleware)
  .get("/me", async ({ currentUser }) => {
    return UsersService.getMe(currentUser.id);
  })
  .patch("/me", async ({ currentUser, body }) => {
    return UsersService.updateMe(currentUser.id, body);
  }, { body: UpdateUserBody });
