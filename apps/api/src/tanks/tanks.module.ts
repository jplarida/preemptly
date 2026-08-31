import { Module } from '@nestjs/common';
import { TanksService } from './tanks.service';
import { TanksController } from './tanks.controller';
import { EstimationModule } from '../estimation/estimation.module';

@Module({
  imports: [EstimationModule],
  controllers: [TanksController],
  providers: [TanksService],
  exports: [TanksService],
})
export class TanksModule {}
