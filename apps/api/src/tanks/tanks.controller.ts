import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TanksService } from './tanks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { AdjustTankDto } from './dto/adjust-tank.dto';

@Controller('tanks')
@UseGuards(JwtAuthGuard)
export class TanksController {
  constructor(private tanksService: TanksService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTankDto) {
    return this.tanksService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.tanksService.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tanksService.findOne(id, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateTankDto) {
    return this.tanksService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tanksService.remove(id, user.id);
  }

  @Get(':id/prediction')
  getPrediction(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tanksService.getPrediction(id, user.id);
  }

  @Post(':id/refill')
  refill(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { refillDate?: string }) {
    // Delegate to refills service - handled in refills module
    return { message: 'Use POST /api/refills endpoint instead', tankId: id };
  }

  @Post(':id/adjust')
  adjust(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: AdjustTankDto) {
    return this.tanksService.adjust(id, user.id, dto.adjustment);
  }
}
