import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message: string;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null && 'message' in res) {
        message = (res as { message: string }).message;
      } else {
        message = JSON.stringify(res);
      }
      if (status >= 400 && status < 500) {
        this.logger.warn(
          `${status} ${request.method} ${request.url} - ${message}`,
          {
            statusCode: status,
            path: request.url,
            method: request.method,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
          },
        );
      } else {
        this.logger.error(
          `${status} ${request.method} ${request.url} - ${message}`,
          exception instanceof Error ? exception.stack : undefined,
          {
            statusCode: status,
            path: request.url,
            method: request.method,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
          },
        );
      }
    } else {
      message =
        exception instanceof Error
          ? exception.message
          : 'Internal server error';
      this.logger.error(
        `500 ${request.method} ${request.url} - Unhandled exception: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
        {
          statusCode: 500,
          path: request.url,
          method: request.method,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
        },
      );
    }
    response.status(status).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
