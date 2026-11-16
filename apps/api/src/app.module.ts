import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { StorageModule } from './modules/storage/storage.module';
import { EventsModule } from './modules/events/events.module';
import { ShopsModule } from './modules/shops/shops.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { DevicesModule } from './modules/devices/devices.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    EventsModule,
    ShopsModule,
    JobsModule,
    DevicesModule,
    AdminModule,
  ],
})
export class AppModule {}
