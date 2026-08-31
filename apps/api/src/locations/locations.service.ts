import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateLocationDto) {
    return this.prisma.location.create({
      data: {
        userId,
        address: dto.address,
        type: dto.type as any,
        timezone: dto.timezone || 'Asia/Manila',
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.location.findMany({
      where: { userId },
      include: { tanks: true },
    });
  }

  async findOne(id: string, userId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: { tanks: true },
    });
    if (!location) throw new NotFoundException('Location not found');
    if (location.userId !== userId) throw new ForbiddenException();
    return location;
  }

  async update(id: string, userId: string, dto: UpdateLocationDto) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) throw new NotFoundException('Location not found');
    if (location.userId !== userId) throw new ForbiddenException();
    return this.prisma.location.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) throw new NotFoundException('Location not found');
    if (location.userId !== userId) throw new ForbiddenException();
    return this.prisma.location.delete({ where: { id } });
  }
}
