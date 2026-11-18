import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error occurred';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj['message'] as string | object) || exception.message;
        errorName = (resObj['error'] as string) || exception.name;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error at ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      message = 'An unexpected error occurred while processing the request.';
    } else {
      this.logger.error(
        `Unknown error at ${request.method} ${request.url}: ${String(exception)}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: errorName,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
