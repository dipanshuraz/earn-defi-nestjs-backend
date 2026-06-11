import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common';
import { AppConfig } from './config/config.types';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app');

  if (!appConfig) {
    throw new Error('Application configuration failed to load');
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: appConfig.nodeEnv === 'production' ? undefined : false,
    }),
  );
  app.enableCors({
    origin: appConfig.corsOrigins.includes('*') ? true : appConfig.corsOrigins,
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });
  app.setGlobalPrefix(appConfig.apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DeFi Earn API')
    .setDescription('Backend API for the DeFi Earn platform')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('users')
    .addTag('wallets')
    .addTag('chains')
    .addTag('assets')
    .addTag('earn')
    .addTag('health')
    .addTag('system')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  app.enableShutdownHooks();

  await app.listen(appConfig.port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application running on port ${appConfig.port}`);
  logger.log(`Environment: ${appConfig.appEnv}`);
  logger.log(`API prefix: /${appConfig.apiPrefix}`);
  logger.log(`Swagger docs: http://localhost:${appConfig.port}/docs`);
}

void bootstrap();
