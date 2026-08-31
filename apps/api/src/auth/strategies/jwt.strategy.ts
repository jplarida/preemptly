import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: { sub: string; phone: string; role?: string }) {
    if (payload.role === 'retailer') {
      const retailer = await this.prisma.retailer.findUnique({
        where: { id: payload.sub },
      });
      if (!retailer) throw new UnauthorizedException();
      return { id: retailer.id, phone: retailer.phone, role: 'retailer', retailer };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, phone: user.phone, role: 'user' };
  }
}
