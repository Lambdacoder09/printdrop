import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly localUploadDir: string;
  private s3Available = false;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'printdrop-documents';
    this.localUploadDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }

    try {
      this.s3Client = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
          secretAccessKey: process.env.S3_SECRET_KEY || 'minioadminpassword',
        },
        forcePathStyle: true,
      });
      this.s3Available = true;
    } catch (err) {
      this.logger.warn('S3 client initialization failed. Using local storage fallback.');
      this.s3Available = false;
    }
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.s3Available && this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        });
        await this.s3Client.send(command);
        return `/api/documents/file/${key}`;
      } catch (err) {
        this.logger.warn(`MinIO upload failed for ${key}, falling back to local disk: ${err}`);
      }
    }

    // Local disk fallback
    const filePath = path.join(this.localUploadDir, key);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, buffer);
    return `/api/documents/file/${key}`;
  }

  async getFileBuffer(key: string): Promise<{ buffer: Buffer; mimeType?: string }> {
    const filePath = path.join(this.localUploadDir, key);
    if (fs.existsSync(filePath)) {
      const buffer = await fs.promises.readFile(filePath);
      return { buffer };
    }

    if (this.s3Available && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      const byteArray = await response.Body?.transformToByteArray();
      return {
        buffer: Buffer.from(byteArray || []),
        mimeType: response.ContentType,
      };
    }

    throw new Error(`File with key ${key} not found`);
  }
}
