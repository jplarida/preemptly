import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { RetailersService } from './retailers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisterRetailerDto } from './dto/register-retailer.dto';

@Controller('retailers')
export class RetailersController {
  constructor(private retailersService: RetailersService) {}

  @Post('register')
  register(@Body() dto: RegisterRetailerDto) {
    return this.retailersService.register(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return this.retailersService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: any, @Body() data: Partial<RegisterRetailerDto>) {
    return this.retailersService.updateProfile(user.id, data);
  }

  @Get('me/dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard(@CurrentUser() user: any) {
    return this.retailersService.getDashboard(user.id);
  }

  @Get('me/customers')
  @UseGuards(JwtAuthGuard)
  getCustomers(@CurrentUser() user: any) {
    return this.retailersService.getCustomersWithStatus(user.id);
  }

  @Get('me/orders')
  @UseGuards(JwtAuthGuard)
  getOrders(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.retailersService.getOrders(user.id, status);
  }

  @Get('me/invite-stats')
  @UseGuards(JwtAuthGuard)
  getInviteStats(@CurrentUser() user: any) {
    return this.retailersService.getInviteStats(user.id);
  }
}
