import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { OtpSender } from './interfaces/otp-sender.interface';
import { OTP_SENDER } from './interfaces/otp-sender.interface';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(OTP_SENDER) private otpSender: OtpSender,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.prisma.otpCode.create({
      data: {
        phone: dto.phone,
        code,
        expiresAt,
      },
    });

    await this.otpSender.send(dto.phone, code);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        code: dto.code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Find or create user
    let isNewUser = false;
    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { phone: dto.phone },
      });
      isNewUser = true;
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: 'user',
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

  async verifyRetailerOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        code: dto.code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    const retailer = await this.prisma.retailer.findUnique({
      where: { phone: dto.phone },
    });

    if (!retailer) {
      throw new BadRequestException('No retailer account found for this phone number');
    }

    const accessToken = this.jwtService.sign({
      sub: retailer.id,
      phone: retailer.phone,
      role: 'retailer',
    });

    return { accessToken, retailer };
  }
}
