import { Elysia } from "elysia";
import { prisma } from "../../lib/prisma";

export const healthModule = new Elysia({ prefix: "/health" }).get("/", async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", timestamp: new Date().toISOString() };
  } catch {
    return { status: "error", timestamp: new Date().toISOString() };
  }
});
