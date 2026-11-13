import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // All endpoints prefixed with /api
  app.setGlobalPrefix('api');

  // Parse HttpOnly cookies
  app.use(cookieParser());

  // Strict request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const rawClientOrigin = config.get<string>('CLIENT_ORIGIN') || 'http://localhost:5173';
  const origins = rawClientOrigin.split(',').map((s) => s.trim());
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
  });

  app.enableShutdownHooks();

  const rawPort = config.get<string>('PORT');
  const port = rawPort ? Number(rawPort) : 5050;
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${JSON.stringify(rawPort)}`);
  }

  await app.listen(port);
  console.log(`Backend server running on port ${port} with client origin ${rawClientOrigin}`);
}

void bootstrap();
