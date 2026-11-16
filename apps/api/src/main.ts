import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const logger = new Logger('PrintDropAPI');
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`PrintDrop Cloud API is running at: http://localhost:${port}`);
  logger.log(`WebSocket Gateway is ready on port ${port}`);
}

bootstrap();
