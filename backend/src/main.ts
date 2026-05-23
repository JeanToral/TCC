// ─────────────────────── Imports ────────────────────────
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

// ─────────────────────── Bootstrap ──────────────────────
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const config = app.get(ConfigService);
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const port = config.get<number>('PORT', 3000);
  const isProd = config.get<string>('NODE_ENV') === 'production';

  // Em produção o frontend é servido pelo próprio NestJS (mesma origem),
  // logo CORS não é necessário. Em dev o Vite roda em porta diferente.
  if (!isProd) {
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });
  }

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
