import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface DeviceInfo {
  id: string;
  shopId: string;
  deviceName: string;
  machineFingerprint: string;
  status: 'ACTIVE' | 'REVOKED';
  activatedAt: string;
  lastSeenAt?: string;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);
  private memoryDevices: Map<string, DeviceInfo> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async activateDevice(params: {
    shopId: string;
    deviceName: string;
    machineFingerprint: string;
    publicKey?: string;
  }): Promise<{ device: DeviceInfo; token: string; certificateSerial: string }> {
    const { shopId, deviceName, machineFingerprint, publicKey } = params;

    // Check if shop already has an active device
    let existingDevice: DeviceInfo | null = null;

    if (this.prisma.isConnected) {
      const dbDevice = await this.prisma.device.findFirst({
        where: { shopId, status: 'ACTIVE' },
      });
      if (dbDevice) {
        existingDevice = {
          id: dbDevice.id,
          shopId: dbDevice.shopId,
          deviceName: dbDevice.deviceName,
          machineFingerprint: dbDevice.machineFingerprint,
          status: dbDevice.status as any,
          activatedAt: dbDevice.activatedAt.toISOString(),
          lastSeenAt: dbDevice.lastSeenAt?.toISOString(),
        };
      }
    } else {
      existingDevice =
        Array.from(this.memoryDevices.values()).find(
          (d) => d.shopId === shopId && d.status === 'ACTIVE'
        ) || null;
    }

    // 1 Account = 1 Computer Enforcement
    if (existingDevice) {
      if (existingDevice.machineFingerprint !== machineFingerprint) {
        this.logger.warn(
          `Unauthorized activation attempt for shop ${shopId}. Existing: ${existingDevice.machineFingerprint}, Incoming: ${machineFingerprint}`
        );
        throw new ForbiddenException(
          'This shop account is already registered on another computer. Contact central admin to reset device authorization.'
        );
      }
      // Same computer reconnecting
      return {
        device: existingDevice,
        token: `pd_tok_${Buffer.from(existingDevice.id).toString('base64')}`,
        certificateSerial: `CERT-${existingDevice.id.slice(0, 8).toUpperCase()}`,
      };
    }

    // First computer activation
    const deviceId = uuidv4();
    const certificateSerial = `CERT-${deviceId.slice(0, 8).toUpperCase()}`;

    const newDevice: DeviceInfo = {
      id: deviceId,
      shopId,
      deviceName: deviceName || 'Shop Counter PC',
      machineFingerprint,
      status: 'ACTIVE',
      activatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };

    if (this.prisma.isConnected) {
      await this.prisma.device.create({
        data: {
          id: newDevice.id,
          shopId: newDevice.shopId,
          deviceName: newDevice.deviceName,
          machineFingerprint: newDevice.machineFingerprint,
          publicKey,
          status: 'ACTIVE',
          certificates: {
            create: {
              serial: certificateSerial,
              publicKey: publicKey || 'self-signed-desktop-key',
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });
    }

    this.memoryDevices.set(newDevice.id, newDevice);

    return {
      device: newDevice,
      token: `pd_tok_${Buffer.from(newDevice.id).toString('base64')}`,
      certificateSerial,
    };
  }

  async heartbeat(deviceId: string) {
    const now = new Date().toISOString();
    const device = this.memoryDevices.get(deviceId);
    if (device) {
      device.lastSeenAt = now;
    }

    if (this.prisma.isConnected) {
      await this.prisma.device.update({
        where: { id: deviceId },
        data: { lastSeenAt: new Date() },
      });
    }

    return { status: 'OK', timestamp: now };
  }

  async resetDeviceAuthorization(shopId: string) {
    if (this.prisma.isConnected) {
      await this.prisma.device.updateMany({
        where: { shopId },
        data: { status: 'REVOKED' },
      });
    }

    for (const [id, dev] of this.memoryDevices.entries()) {
      if (dev.shopId === shopId) {
        dev.status = 'REVOKED';
      }
    }

    return { message: `Device authorization reset for shop ${shopId}. New computer can now be registered.` };
  }
}
