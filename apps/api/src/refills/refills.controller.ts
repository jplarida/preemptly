import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { RefillsService } from './refills.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LogRefillDto } from './dto/log-refill.dto';

@Controller('refills')
@UseGuards(JwtAuthGuard)
export class RefillsController {
  constructor(private refillsService: RefillsService) {}

  @Post()
  logRefill(@CurrentUser() user: any, @Body() dto: LogRefillDto) {
    return this.refillsService.logRefill(user.id, dto);
  }

  @Get('tank/:tankId')
  getHistory(@Param('tankId') tankId: string, @CurrentUser() user: any) {
    return this.refillsService.getHistory(tankId, user.id);
  }

  @Patch(':id/confirm')
  confirmOutlier(@Param('id') id: string, @CurrentUser() user: any) {
    return this.refillsService.confirmOutlier(id, user.id);
  }
}
