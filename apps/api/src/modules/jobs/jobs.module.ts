import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController, DocumentsController } from './jobs.controller';
import { ShopsModule } from '../shops/shops.module';

@Module({
  imports: [ShopsModule],
  controllers: [JobsController, DocumentsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
