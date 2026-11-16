import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getOverviewStats();
  }

  @Post('shops')
  async createShop(@Body() body: any) {
    return this.adminService.createShop(body);
  }

  @Post('shops/:id/reset-device')
  async resetDevice(@Param('id') id: string) {
    return this.adminService.resetShopDevice(id);
  }
}
