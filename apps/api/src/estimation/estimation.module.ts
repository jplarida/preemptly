import { Module, forwardRef } from '@nestjs/common';
import { EstimationEngine } from './estimation.engine';
import { EstimationService } from './estimation.service';
import { EstimationScheduler } from './estimation.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  providers: [EstimationEngine, EstimationService, EstimationScheduler],
  exports: [EstimationEngine, EstimationService],
})
export class EstimationModule {}
