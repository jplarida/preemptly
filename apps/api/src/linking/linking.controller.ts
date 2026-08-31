import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { LinkingService } from './linking.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LinkRetailerDto } from './dto/link-retailer.dto';

@Controller('link')
export class LinkingController {
  constructor(private linkingService: LinkingService) {}

  @Get('retailer/:code')
  resolveCode(@Param('code') code: string) {
    return this.linkingService.resolveInviteCode(code);
  }

  @Post('retailer')
  @UseGuards(JwtAuthGuard)
  linkRetailer(@CurrentUser() user: any, @Body() dto: LinkRetailerDto) {
    return this.linkingService.linkCustomerToRetailer(user.id, dto);
  }

  @Delete('retailer/:retailerId')
  @UseGuards(JwtAuthGuard)
  unlinkRetailer(@Param('retailerId') retailerId: string, @CurrentUser() user: any) {
    return this.linkingService.unlinkCustomerFromRetailer(user.id, retailerId);
  }

  @Get('retailers')
  @UseGuards(JwtAuthGuard)
  getLinkedRetailers(@CurrentUser() user: any) {
    return this.linkingService.getLinkedRetailers(user.id);
  }
}
