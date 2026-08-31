import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { prisma } from "./prisma";
import { unauthorized } from "./errors";
import type { Retailer, Rider } from "@prisma/client";

export interface CurrentUser {
  id: string;
  phone: string;
  role: "user" | "retailer" | "rider";
  retailer?: Retailer;
  rider?: Rider;
}

export const jwtPlugin = new Elysia({ name: "jwt-plugin" }).use(
  jwt({
    name: "jwt",
    secret: process.env.JWT_SECRET || "dev-secret",
    exp: process.env.JWT_EXPIRES_IN || "30d",
  }),
);

export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ headers, jwt }): Promise<{ currentUser: CurrentUser }> => {
    const auth = headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      unauthorized("Missing or invalid authorization header");
    }

    const token = auth.slice(7);
    const payload = await jwt.verify(token);
    if (!payload) {
      unauthorized("Invalid or expired token");
    }

    const { sub, role } = payload as { sub: string; phone: string; role: string };

    if (role === "retailer") {
      const retailer = await prisma.retailer.findUnique({ where: { id: sub } });
      if (!retailer) unauthorized("Retailer not found");
      return { currentUser: { id: sub, phone: retailer!.phone, role: "retailer", retailer: retailer! } };
    }

    if (role === "rider") {
      const rider = await prisma.rider.findUnique({ where: { id: sub } });
      if (!rider) unauthorized("Rider not found");
      return { currentUser: { id: sub, phone: rider!.phone, role: "rider", rider: rider! } };
    }

    // Default: user role
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user) unauthorized("User not found");
    return { currentUser: { id: sub, phone: user!.phone, role: "user" } };
  });
