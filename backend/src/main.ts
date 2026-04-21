// ─────────────────────── Imports ────────────────────────
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

// ─────────────────────── Bootstrap ──────────────────────
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const port = config.get<number>('PORT', 3000);

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
}

bootstrap();
