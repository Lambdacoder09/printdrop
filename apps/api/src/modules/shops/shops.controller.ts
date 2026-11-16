import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { ShopsService } from './shops.service';

@Controller('api/shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  async getAllShops() {
    return this.shopsService.getAllShops();
  }

  @Get('by-slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.shopsService.getShopBySlug(slug);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.shopsService.getShopById(id);
  }

  @Get(':slug/qr')
  async getShopQr(
    @Param('slug') slug: string,
    @Query('baseUrl') baseUrl?: string
  ) {
    const qrDataUrl = await this.shopsService.generateShopQrCode(slug, baseUrl);
    return { slug, qrDataUrl };
  }

  @Patch(':id/pricing')
  async updatePricing(
    @Param('id') id: string,
    @Body() pricing: any
  ) {
    return this.shopsService.updatePricing(id, pricing);
  }
}
