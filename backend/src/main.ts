import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';

const backendRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });
dotenv.config({ path: path.resolve(backendRoot, '..', '.env') });

async function bootstrap() {
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule);
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === 'production' && origins.includes('*')) {
    throw new Error('CORS_ORIGIN không được là wildcard trong môi trường production.');
  }
  app.enableCors({ origin: origins, credentials: false });
  app.use((_request: unknown, response: { setHeader(name: string, value: string): void }, next: () => void) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
