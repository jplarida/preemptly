import { prisma } from "../../lib/prisma";
import { otpSender } from "../../lib/otp-sender";
import { badRequest } from "../../lib/errors";

export class AuthService {
  static async sendOtp(phone: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpCode.create({
      data: { phone, code, expiresAt },
    });

    await otpSender.send(phone, code);

    return { message: "OTP sent successfully" };
  }

  private static async validateOtp(phone: string, code: string) {
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      badRequest("Invalid or expired OTP");
    }

    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    return otpRecord;
  }

  static async verifyOtp(phone: string, code: string, signJwt: (payload: Record<string, string | number | boolean>) => Promise<string>) {
    await this.validateOtp(phone, code);

    let isNewUser = false;
    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({ data: { phone } });
      isNewUser = true;
    }

    const accessToken = await signJwt({
      sub: user.id,
      phone: user.phone,
      role: "user",
    });

    return {
      accessToken,
      isNewUser,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        region: user.region,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  static async verifyRetailerOtp(phone: string, code: string, signJwt: (payload: Record<string, string | number | boolean>) => Promise<string>) {
    await this.validateOtp(phone, code);

    const retailer = await prisma.retailer.findUnique({ where: { phone } });
    if (!retailer) {
      badRequest("No retailer account found for this phone number");
    }

    const accessToken = await signJwt({
      sub: retailer.id,
      phone: retailer.phone,
      role: "retailer",
    });

    return { accessToken, retailer };
  }

  static async verifyRiderOtp(phone: string, code: string, signJwt: (payload: Record<string, string | number | boolean>) => Promise<string>) {
    await this.validateOtp(phone, code);

    const rider = await prisma.rider.findUnique({ where: { phone } });
    if (!rider) {
      badRequest("No rider account found for this phone number");
    }

    const accessToken = await signJwt({
      sub: rider.id,
      phone: rider.phone,
      role: "rider",
    });

    return { accessToken, rider };
  }
}
