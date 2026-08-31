import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/errors";

export class UsersService {
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) notFound("User not found");
    return user;
  }

  static async updateMe(userId: string, data: { name?: string; region?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
