import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ShopsModule } from '../shops/shops.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [ShopsModule, DevicesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
