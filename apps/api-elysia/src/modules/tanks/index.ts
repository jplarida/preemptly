import { Elysia } from "elysia";
import { authMiddleware } from "../../lib/auth";
import { TanksService } from "./service";
import { CreateTankBody, UpdateTankBody, AdjustTankBody } from "./model";

export const tanksModule = new Elysia({ prefix: "/tanks" })
  .use(authMiddleware)
  .post("/", async ({ currentUser, body }) => {
    return TanksService.create(currentUser.id, body);
  }, { body: CreateTankBody })
  .get("/", async ({ currentUser }) => {
    return TanksService.findAllByUser(currentUser.id);
  })
  .get("/:id", async ({ currentUser, params }) => {
    return TanksService.findOne(params.id, currentUser.id);
  })
  .patch("/:id", async ({ currentUser, params, body }) => {
    return TanksService.update(params.id, currentUser.id, body);
  }, { body: UpdateTankBody })
  .delete("/:id", async ({ currentUser, params }) => {
    return TanksService.remove(params.id, currentUser.id);
  })
  .get("/:id/prediction", async ({ currentUser, params }) => {
    return TanksService.getPrediction(params.id, currentUser.id);
  })
  .post("/:id/adjust", async ({ currentUser, params, body }) => {
    return TanksService.adjust(params.id, currentUser.id, body.adjustment);
  }, { body: AdjustTankBody });
