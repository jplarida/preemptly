import { Module } from '@nestjs/common';
import { RefillsService } from './refills.service';
import { RefillsController } from './refills.controller';
import { EstimationModule } from '../estimation/estimation.module';

@Module({
  imports: [EstimationModule],
  controllers: [RefillsController],
  providers: [RefillsService],
  exports: [RefillsService],
})
export class RefillsModule {}
