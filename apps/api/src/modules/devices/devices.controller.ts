import { Controller, Post, Body, Param } from '@nestjs/common';
import { DevicesService } from './devices.service';

@Controller('api/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('activate')
  async activate(
    @Body()
    body: {
      shopId: string;
      deviceName: string;
      machineFingerprint: string;
      publicKey?: string;
    }
  ) {
    return this.devicesService.activateDevice(body);
  }

  @Post(':id/heartbeat')
  async heartbeat(@Param('id') id: string) {
    return this.devicesService.heartbeat(id);
  }

  @Post('shop/:shopId/reset')
  async resetShopDevice(@Param('shopId') shopId: string) {
    return this.devicesService.resetDeviceAuthorization(shopId);
  }
}
