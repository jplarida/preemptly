import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { TanksModule } from './tanks/tanks.module';
import { EstimationModule } from './estimation/estimation.module';
import { RefillsModule } from './refills/refills.module';
import { OrdersModule } from './orders/orders.module';
import { RetailersModule } from './retailers/retailers.module';
import { LinkingModule } from './linking/linking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    LocationsModule,
    TanksModule,
    EstimationModule,
    RefillsModule,
    OrdersModule,
    RetailersModule,
    LinkingModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
