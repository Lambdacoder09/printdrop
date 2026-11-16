import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JobsService } from './jobs.service';
import { StorageService } from '../storage/storage.service';
import { CreateJobInput, PaymentMethodType, JobStatusType } from '@printdrop/shared';

@Controller('api/jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly storageService: StorageService
  ) {}

  @Post()
  async createJob(
    @Body()
    body: {
      shopSlug: string;
      customerName: string;
      customerPhone?: string;
      notes?: string;
    }
  ) {
    return this.jobsService.createJob(body);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: any
  ) {
    return this.jobsService.addDocument(id, file, meta);
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  @Get('shop/:shopId')
  async getShopJobs(@Param('shopId') shopId: string) {
    return this.jobsService.getJobsByShop(shopId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: JobStatusType
  ) {
    return this.jobsService.updateStatus(id, status);
  }

  @Post(':id/bill')
  async generateBill(
    @Param('id') id: string,
    @Body() body: { amount: number; items: any[] }
  ) {
    return this.jobsService.setBilling(id, body.amount, body.items || []);
  }

  @Post(':id/confirm-payment')
  async confirmPayment(
    @Param('id') id: string,
    @Body() body: { method: PaymentMethodType; upiRef?: string }
  ) {
    return this.jobsService.confirmPayment(id, body.method, body.upiRef);
  }
}

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly storageService: StorageService) {}

  @Get('file/*')
  async getFile(@Param() params: Record<string, string>, @Res() res: Response) {
    const key = params[0] || (params as any)['*'];
    const { buffer, mimeType } = await this.storageService.getFileBuffer(key);
    if (mimeType) {
      res.setHeader('Content-Type', mimeType);
    }
    res.send(buffer);
  }
}
