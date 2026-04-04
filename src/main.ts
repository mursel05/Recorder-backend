import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ExceptionsFilter } from './common/filters/exceptions.filter';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Starting application...');
    const app = await NestFactory.create(AppModule, {
      logger: WinstonModule.createLogger({
        transports: [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
          new winston.transports.File({
            filename: 'logs/warn.log',
            level: 'warn',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.printf((info) => {
                const { timestamp, level, message, context } = info;
                return `${timestamp as string} [${context as string}] ${level}: ${message as string}`;
              }),
            ),
          }),
        ],
      }),
    });
    const configService = app.get(ConfigService);
    const config = new DocumentBuilder()
      .setTitle('Constantin Api')
      .setDescription('The API documentation for Constantin')
      .setVersion('1.0')
      .addServer(
        (configService.get<string>('app.baseUrl') as string) +
          '/' +
          configService.get<string>('app.apiPrefix'),
      )
      .setExternalDoc('Postman Collection', '/docs-json')
      .build();
    const document = SwaggerModule.createDocument(app, config);

    app.setGlobalPrefix(configService.get<string>('app.apiPrefix') as string);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.enableCors({
      origin: configService.get<string>('app.clientUrl'),
      credentials: true,
    });
    app.use(cookieParser());
    app.useGlobalFilters(new ExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    SwaggerModule.setup('docs', app, document);

    await app.listen(configService.get<number>('app.port') as number);

    logger.log('Application is ready to accept requests');
  } catch (error) {
    logger.error(
      'Failed to start application',
      error instanceof Error ? error.stack : String(error),
    );
    process.exit(1);
  }

  process.on('SIGTERM', () => {
    logger.log('SIGTERM signal received: closing HTTP server');
  });
  process.on('SIGINT', () => {
    logger.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
  });
}

void bootstrap();
