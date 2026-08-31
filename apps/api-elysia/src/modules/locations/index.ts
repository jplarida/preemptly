import { Elysia } from "elysia";
import { authMiddleware } from "../../lib/auth";
import { LocationsService } from "./service";
import { CreateLocationBody, UpdateLocationBody } from "./model";

export const locationsModule = new Elysia({ prefix: "/locations" })
  .use(authMiddleware)
  .post("/", async ({ currentUser, body }) => {
    return LocationsService.create(currentUser.id, body);
  }, { body: CreateLocationBody })
  .get("/", async ({ currentUser }) => {
    return LocationsService.findAllByUser(currentUser.id);
  })
  .get("/:id", async ({ currentUser, params }) => {
    return LocationsService.findOne(params.id, currentUser.id);
  })
  .patch("/:id", async ({ currentUser, params, body }) => {
    return LocationsService.update(params.id, currentUser.id, body);
  }, { body: UpdateLocationBody })
  .delete("/:id", async ({ currentUser, params }) => {
    return LocationsService.remove(params.id, currentUser.id);
  });
