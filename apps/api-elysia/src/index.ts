import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { HttpError } from "./lib/errors";
import { healthModule } from "./modules/health";
import { authModule } from "./modules/auth";
import { usersModule } from "./modules/users";
import { locationsModule } from "./modules/locations";
import { tanksModule } from "./modules/tanks";
import { refillsModule } from "./modules/refills";
import { notificationsModule } from "./modules/notifications";
import { discountsModule } from "./modules/discounts";
import { retailersModule } from "./modules/retailers";
import { ordersModule } from "./modules/orders";
import { ridersModule } from "./modules/riders";
import { linkingModule } from "./modules/linking";
import { estimationScheduler } from "./modules/estimation/scheduler";

const app = new Elysia({ prefix: "/api" })
  .use(
    cors({
      origin: process.env.WEB_URL || "http://localhost:3001",
      credentials: true,
    }),
  )
  .onError(({ error, set }) => {
    if (error instanceof HttpError) {
      set.status = error.status;
      return {
        statusCode: error.status,
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
    const status = (error as any).status ?? 500;
    set.status = status;
    return {
      statusCode: status,
      message: "message" in error ? (error as any).message : "Internal Server Error",
      timestamp: new Date().toISOString(),
    };
  })
  .use(healthModule)
  .use(authModule)
  .use(usersModule)
  .use(locationsModule)
  .use(tanksModule)
  .use(refillsModule)
  .use(notificationsModule)
  .use(discountsModule)
  .use(retailersModule)
  .use(ordersModule)
  .use(ridersModule)
  .use(linkingModule)
  .use(estimationScheduler);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`[api-elysia] running on http://localhost:${port}/api`);
});

export type App = typeof app;
