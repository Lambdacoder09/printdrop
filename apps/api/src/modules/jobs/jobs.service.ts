import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EventsGateway } from '../events/events.gateway';
import { ShopsService } from '../shops/shops.service';
import {
  Job,
  JobDocument,
  JobStatus,
  JobStatusType,
  PaymentMethodType,
  PaymentStatus,
  SocketEvents,
  Invoice,
} from '@printdrop/shared';
import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private memoryJobs: Map<string, Job> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventsGateway,
    private readonly shops: ShopsService
  ) {}

  private generateAccessCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async createJob(params: {
    shopSlug: string;
    customerName: string;
    customerPhone?: string;
    notes?: string;
  }): Promise<Job> {
    const shop = await this.shops.getShopBySlug(params.shopSlug);
    const accessCode = this.generateAccessCode();
    const jobId = uuidv4();

    const newJob: Job = {
      id: jobId,
      shopId: shop.id,
      accessCode,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      documents: [],
      status: JobStatus.SUBMITTED,
      totalEstimatedPages: 0,
      paymentStatus: PaymentStatus.PENDING,
      notes: params.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (this.prisma.isConnected) {
      await this.prisma.job.create({
        data: {
          id: newJob.id,
          shopId: newJob.shopId,
          accessCode: newJob.accessCode,
          customerName: newJob.customerName,
          customerPhone: newJob.customerPhone,
          status: newJob.status,
          totalEstimatedPages: 0,
          notes: newJob.notes,
        },
      });
    }

    this.memoryJobs.set(newJob.id, newJob);

    // Notify shopkeeper via websocket
    this.events.emitToShop(shop.id, SocketEvents.JOB_CREATED, newJob);

    return newJob;
  }

  async addDocument(
    jobId: string,
    file: Express.Multer.File,
    meta?: {
      colorMode?: 'BW' | 'COLOR';
      sides?: 'SINGLE' | 'DOUBLE_LONG' | 'DOUBLE_SHORT';
      copies?: number;
      pageRange?: string;
    }
  ): Promise<JobDocument> {
    const job = await this.getJobById(jobId);
    let pageCount = 1;

    // Detect actual page count if PDF
    if (file.mimetype === 'application/pdf') {
      try {
        const pdfDoc = await PDFDocument.load(file.buffer);
        pageCount = pdfDoc.getPageCount();
      } catch (err) {
        this.logger.warn(`Could not parse PDF page count for ${file.originalname}: ${err}`);
      }
    }

    const docId = uuidv4();
    const ext = file.originalname.split('.').pop() || 'dat';
    const storageKey = `jobs/${jobId}/${docId}.${ext}`;

    const downloadPath = await this.storage.uploadFile(storageKey, file.buffer, file.mimetype);

    const doc: JobDocument = {
      id: docId,
      jobId,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      pageCount,
      storageKey,
      previewUrl: downloadPath,
      downloadUrl: downloadPath,
      colorMode: meta?.colorMode || 'BW',
      sides: meta?.sides || 'SINGLE',
      copies: meta?.copies ? Number(meta.copies) : 1,
      pageRange: meta?.pageRange,
      createdAt: new Date().toISOString(),
    };

    job.documents.push(doc);
    job.totalEstimatedPages = job.documents.reduce(
      (sum, d) => sum + (d.pageCount || 1) * (d.copies || 1),
      0
    );
    job.updatedAt = new Date().toISOString();

    if (this.prisma.isConnected) {
      await this.prisma.jobDocument.create({
        data: {
          id: doc.id,
          jobId: doc.jobId,
          originalName: doc.originalName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          pageCount: doc.pageCount,
          storageKey: doc.storageKey,
          previewUrl: doc.previewUrl,
          downloadUrl: doc.downloadUrl,
          colorMode: doc.colorMode,
          sides: doc.sides,
          copies: doc.copies,
          pageRange: doc.pageRange,
        },
      });

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          totalEstimatedPages: job.totalEstimatedPages,
          updatedAt: new Date(),
        },
      });
    }

    this.memoryJobs.set(job.id, job);

    // Notify shop and customer
    this.events.emitToShop(job.shopId, SocketEvents.JOB_STATUS_UPDATED, job);
    this.events.emitToJob(job.id, SocketEvents.JOB_STATUS_UPDATED, job);

    return doc;
  }

  async getJobById(jobId: string): Promise<Job> {
    if (this.prisma.isConnected) {
      const dbJob = await this.prisma.job.findUnique({
        where: { id: jobId },
        include: { documents: true, invoice: { include: { items: true } } },
      });
      if (dbJob) {
        return {
          id: dbJob.id,
          shopId: dbJob.shopId,
          accessCode: dbJob.accessCode,
          customerName: dbJob.customerName,
          customerPhone: dbJob.customerPhone || undefined,
          documents: dbJob.documents as any,
          status: dbJob.status as JobStatusType,
          totalEstimatedPages: dbJob.totalEstimatedPages,
          billingAmount: dbJob.billingAmount || undefined,
          paymentMethod: (dbJob.paymentMethod as PaymentMethodType) || undefined,
          paymentStatus: dbJob.paymentStatus as any,
          paymentUpiRef: dbJob.paymentUpiRef || undefined,
          notes: dbJob.notes || undefined,
          createdAt: dbJob.createdAt.toISOString(),
          updatedAt: dbJob.updatedAt.toISOString(),
        };
      }
    }

    const job = this.memoryJobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Job #${jobId} not found`);
    }
    return job;
  }

  async getJobsByShop(shopId: string): Promise<Job[]> {
    if (this.prisma.isConnected) {
      const dbJobs = await this.prisma.job.findMany({
        where: { shopId },
        include: { documents: true, invoice: { include: { items: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (dbJobs.length > 0) {
        return dbJobs.map((j) => ({
          id: j.id,
          shopId: j.shopId,
          accessCode: j.accessCode,
          customerName: j.customerName,
          customerPhone: j.customerPhone || undefined,
          documents: j.documents as any,
          status: j.status as JobStatusType,
          totalEstimatedPages: j.totalEstimatedPages,
          billingAmount: j.billingAmount || undefined,
          paymentMethod: (j.paymentMethod as PaymentMethodType) || undefined,
          paymentStatus: j.paymentStatus as any,
          paymentUpiRef: j.paymentUpiRef || undefined,
          notes: j.notes || undefined,
          createdAt: j.createdAt.toISOString(),
          updatedAt: j.updatedAt.toISOString(),
        }));
      }
    }

    return Array.from(this.memoryJobs.values())
      .filter((j) => j.shopId === shopId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateStatus(jobId: string, status: JobStatusType): Promise<Job> {
    const job = await this.getJobById(jobId);
    job.status = status;
    job.updatedAt = new Date().toISOString();

    if (this.prisma.isConnected) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: { status, updatedAt: new Date() },
      });
    }

    this.memoryJobs.set(job.id, job);

    // Auto-Purge Privacy Lifecycle: Once completed or cancelled, purge uploaded documents from storage
    if (status === JobStatus.COMPLETED || status === JobStatus.CANCELLED) {
      setTimeout(async () => {
        try {
          if (job.documents && job.documents.length > 0) {
            for (const doc of job.documents) {
              if (doc.storageKey) {
                await this.storage.deleteFile(doc.storageKey);
              }
            }
            this.logger.log(`[Auto-Purge] Cleaned up documents for completed job #${job.accessCode}`);
          }
        } catch (purgeErr) {
          this.logger.warn(`Failed to auto-purge files for job ${job.id}: ${purgeErr}`);
        }
      }, 5000); // 5-second grace window after completion
    }

    this.events.emitToShop(job.shopId, SocketEvents.JOB_STATUS_UPDATED, job);
    this.events.emitToJob(job.id, SocketEvents.JOB_STATUS_UPDATED, job);

    return job;
  }

  async setBilling(
    jobId: string,
    amount: number,
    items: Array<{ description: string; service: string; quantity: number; rate: number; amount: number }>
  ): Promise<{ job: Job; upiString?: string; upiQr?: string }> {
    const job = await this.getJobById(jobId);
    const shop = await this.shops.getShopById(job.shopId);

    job.billingAmount = amount;
    job.status = JobStatus.BILLED;
    job.updatedAt = new Date().toISOString();

    // Generate UPI Payment Intent string (UPI specification for India)
    // upi://pay?pa=<upi_id>&pn=<shop_name>&am=<amount>&cu=INR&tn=Job_<accessCode>
    let upiString = '';
    let upiQr = '';
    if (shop.upiId) {
      const encodedShopName = encodeURIComponent(shop.name);
      const note = encodeURIComponent(`PrintDrop Bill #${job.accessCode}`);
      upiString = `upi://pay?pa=${shop.upiId}&pn=${encodedShopName}&am=${amount.toFixed(2)}&cu=INR&tn=${note}`;
      upiQr = await QRCode.toDataURL(upiString, { margin: 1, scale: 6 });
    }

    if (this.prisma.isConnected) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          billingAmount: amount,
          status: JobStatus.BILLED,
          updatedAt: new Date(),
        },
      });

      await this.prisma.invoice.upsert({
        where: { jobId },
        update: {
          subtotal: amount,
          total: amount,
          status: 'ISSUED',
        },
        create: {
          jobId,
          shopId: job.shopId,
          customerName: job.customerName,
          subtotal: amount,
          discount: 0,
          total: amount,
          status: 'ISSUED',
          items: {
            create: items.map((i) => ({
              description: i.description,
              service: i.service,
              quantity: i.quantity,
              rate: i.rate,
              amount: i.amount,
            })),
          },
        },
      });
    }

    this.memoryJobs.set(job.id, job);

    const payload = { job, upiString, upiQr };
    this.events.emitToShop(job.shopId, SocketEvents.JOB_BILLED, payload);
    this.events.emitToJob(job.id, SocketEvents.JOB_BILLED, payload);

    return payload;
  }

  async confirmPayment(jobId: string, method: PaymentMethodType, upiRef?: string): Promise<Job> {
    const job = await this.getJobById(jobId);
    job.paymentMethod = method;
    job.paymentStatus = PaymentStatus.CONFIRMED;
    job.paymentUpiRef = upiRef;
    job.status = JobStatus.PAID;
    job.updatedAt = new Date().toISOString();

    if (this.prisma.isConnected) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          paymentMethod: method,
          paymentStatus: PaymentStatus.CONFIRMED,
          paymentUpiRef: upiRef,
          status: JobStatus.PAID,
          updatedAt: new Date(),
        },
      });
    }

    this.memoryJobs.set(job.id, job);

    this.events.emitToShop(job.shopId, SocketEvents.PAYMENT_CONFIRMED, job);
    this.events.emitToJob(job.id, SocketEvents.PAYMENT_CONFIRMED, job);

    return job;
  }
}
