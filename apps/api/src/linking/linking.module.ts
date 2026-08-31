import { Module } from '@nestjs/common';
import { LinkingService } from './linking.service';
import { LinkingController } from './linking.controller';

@Module({
  controllers: [LinkingController],
  providers: [LinkingService],
  exports: [LinkingService],
})
export class LinkingModule {}
