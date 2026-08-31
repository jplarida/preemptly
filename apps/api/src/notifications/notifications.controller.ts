import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('device-token')
  registerToken(
    @CurrentUser() user: any,
    @Body() body: { token: string; platform: string },
  ) {
    return this.notificationsService.registerDeviceToken(user.id, body.token, body.platform);
  }

  @Delete('device-token/:token')
  removeToken(@Param('token') token: string) {
    return this.notificationsService.removeDeviceToken(token);
  }
}
