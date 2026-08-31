import { Module } from '@nestjs/common';
import { RetailersService } from './retailers.service';
import { RetailersController } from './retailers.controller';
import { EstimationModule } from '../estimation/estimation.module';

@Module({
  imports: [EstimationModule],
  controllers: [RetailersController],
  providers: [RetailersService],
  exports: [RetailersService],
})
export class RetailersModule {}
