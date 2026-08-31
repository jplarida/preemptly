import { prisma } from "../../lib/prisma";
import { notFound, forbidden } from "../../lib/errors";

export class LocationsService {
  static async create(userId: string, data: { address: string; type?: string; timezone?: string }) {
    return prisma.location.create({
      data: {
        userId,
        address: data.address,
        type: (data.type as any) || "HOME",
        timezone: data.timezone || "Asia/Manila",
      },
    });
  }

  static async findAllByUser(userId: string) {
    return prisma.location.findMany({
      where: { userId },
      include: { tanks: true },
    });
  }

  static async findOne(id: string, userId: string) {
    const location = await prisma.location.findUnique({
      where: { id },
      include: { tanks: true },
    });
    if (!location) notFound("Location not found");
    if (location.userId !== userId) forbidden();
    return location;
  }

  static async update(id: string, userId: string, data: { address?: string; type?: string; timezone?: string }) {
    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) notFound("Location not found");
    if (location.userId !== userId) forbidden();
    return prisma.location.update({ where: { id }, data: data as any });
  }

  static async remove(id: string, userId: string) {
    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) notFound("Location not found");
    if (location.userId !== userId) forbidden();
    return prisma.location.delete({ where: { id } });
  }
}
