import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as QRCode from 'qrcode';
import { ShopPricing, Shop } from '@printdrop/shared';

// In-memory fallback if database is offline during first boot
const DEFAULT_SHOPS: Shop[] = [
  {
    id: 'shop-001-sgx',
    name: 'Shree Ganesh Xerox & Cyber Cafe',
    slug: 'shree-ganesh-xerox',
    ownerName: 'Ramesh Patel',
    phone: '+91 98765 43210',
    email: 'ramesh.xerox@example.com',
    upiId: '9876543210@upi',
    address: 'Shop 12, Station Road, Opp. Bus Stand, Mumbai',
    status: 'ACTIVE',
    pricing: {
      bwPageRate: 2.0,
      colorPageRate: 10.0,
      photocopyRate: 2.0,
      scanningRate: 5.0,
      laminationRate: 20.0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'shop-002-kcp',
    name: 'Kishan Digital Printing Hub',
    slug: 'kishan-printing',
    ownerName: 'Kishan Sharma',
    phone: '+91 98234 56789',
    email: 'kishan.print@example.com',
    upiId: 'kishanprint@okaxis',
    address: 'Near Delhi University North Campus, New Delhi',
    status: 'ACTIVE',
    pricing: {
      bwPageRate: 1.5,
      colorPageRate: 8.0,
      photocopyRate: 1.5,
      scanningRate: 5.0,
      laminationRate: 15.0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

@Injectable()
export class ShopsService {
  private memoryShops: Shop[] = [...DEFAULT_SHOPS];

  constructor(private readonly prisma: PrismaService) {}

  async getShopBySlug(slug: string) {
    if (this.prisma.isConnected) {
      const shop = await this.prisma.shop.findUnique({
        where: { slug },
        include: { pricing: true },
      });
      if (shop) return shop;
    }

    const memoryShop = this.memoryShops.find((s) => s.slug === slug);
    if (!memoryShop) {
      throw new NotFoundException(`Shop with slug "${slug}" not found`);
    }
    return memoryShop;
  }

  async getShopById(id: string) {
    if (this.prisma.isConnected) {
      const shop = await this.prisma.shop.findUnique({
        where: { id },
        include: { pricing: true },
      });
      if (shop) return shop;
    }

    const memoryShop = this.memoryShops.find((s) => s.id === id);
    if (!memoryShop) {
      throw new NotFoundException(`Shop with ID "${id}" not found`);
    }
    return memoryShop;
  }

  async getAllShops() {
    if (this.prisma.isConnected) {
      const shops = await this.prisma.shop.findMany({
        include: { pricing: true, devices: true },
      });
      if (shops.length > 0) return shops;
    }
    return this.memoryShops;
  }

  async createShop(data: {
    name: string;
    slug: string;
    ownerName: string;
    phone: string;
    email?: string;
    upiId?: string;
    address?: string;
    pricing?: ShopPricing;
  }) {
    const pricing = data.pricing || {
      bwPageRate: 2.0,
      colorPageRate: 10.0,
      photocopyRate: 2.0,
      scanningRate: 5.0,
      laminationRate: 20.0,
    };

    if (this.prisma.isConnected) {
      return this.prisma.shop.create({
        data: {
          name: data.name,
          slug: data.slug,
          ownerName: data.ownerName,
          phone: data.phone,
          email: data.email,
          upiId: data.upiId,
          address: data.address,
          pricing: {
            create: pricing,
          },
        },
        include: { pricing: true },
      });
    }

    const newShop = {
      id: `shop-${Date.now()}`,
      ...data,
      status: 'ACTIVE' as const,
      pricing,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memoryShops.push(newShop);
    return newShop;
  }

  async updatePricing(shopId: string, pricing: Partial<ShopPricing>) {
    if (this.prisma.isConnected) {
      return this.prisma.shopPricing.upsert({
        where: { shopId },
        update: pricing,
        create: {
          shopId,
          bwPageRate: pricing.bwPageRate ?? 2.0,
          colorPageRate: pricing.colorPageRate ?? 10.0,
          photocopyRate: pricing.photocopyRate ?? 2.0,
          scanningRate: pricing.scanningRate ?? 5.0,
          laminationRate: pricing.laminationRate ?? 20.0,
        },
      });
    }

    const shop = this.memoryShops.find((s) => s.id === shopId);
    if (shop) {
      shop.pricing = { ...shop.pricing, ...pricing };
      return shop.pricing;
    }
    throw new NotFoundException('Shop not found');
  }

  async generateShopQrCode(slug: string, baseUrl?: string): Promise<string> {
    const host = baseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    const uploadUrl = `${host}/shop/${slug}`;
    return QRCode.toDataURL(uploadUrl, {
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  }
}
