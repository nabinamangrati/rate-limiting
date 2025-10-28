import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { redisClient } from './redis.module'; // your redis client


import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
import { TokenBucketMiddleware } from './common/middleware/token-bucket.middleware';

async function bootstrap() {
  const logger = new Logger('bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );
  const port = process.env.PORT || 5000;
  const env_mode = process.env.NODE_ENV || '';

  // Configure global CORS with all origins allowed
  app.enableCors({
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['*'],
    credentials: true,
  });
  // Register UserMiddleware and TenantMiddleware globally
    const { UserMiddleware } = await import(
    './common/middleware/user.middleware'
  );
  const {TokenBucketMiddleware} = await import(
    './common/middleware/token-bucket.middleware'
  );
  const { PrismaService } = await import('./prisma/prisma.service');
  const prisma = app.get(PrismaService);
  
  const { JwtService } = await import('@nestjs/jwt');

  await app.register(helmet);
  await app.register(multipart);


  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const jwtService = app.get(JwtService);

  // Fastify: use addHook for async middlewares
app
.getHttpAdapter()
.getInstance()
.addHook('preHandler', async (req, res) => {
  await new UserMiddleware(jwtService, prisma).use(req, res, () => {});

  await TokenBucketMiddleware(redisClient)(req, res);
});

  app.setGlobalPrefix('api').enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  // Api Docs
  setupSwagger(app);
  await app.listen(port, '0.0.0.0');
  logger.log(`Application listening on port ${port} in ${env_mode} mode`);
}
void bootstrap();
