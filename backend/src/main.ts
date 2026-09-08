import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // CRM stores compressed photos as base64 data URLs in the database.
  app.use(json({ limit: '15mb' }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
