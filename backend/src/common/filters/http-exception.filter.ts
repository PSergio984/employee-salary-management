import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let fieldErrors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        code = this.statusCodeToErrorCode(status);
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        if (obj.error && typeof obj.error === 'object') {
          const innerError = obj.error as Record<string, unknown>;
          code = (innerError.code as string) || this.statusCodeToErrorCode(status);
          message = (innerError.message as string) || exception.message;
          if (innerError.fieldErrors) {
            fieldErrors = innerError.fieldErrors as Record<string, string[]>;
          }
        } else {
          code = (obj.error as string) || this.statusCodeToErrorCode(status);
          message = (obj.message as string) || exception.message;

          // If class-validator returned an array of messages
          if (Array.isArray(obj.message)) {
            code = 'VALIDATION_ERROR';
            message = 'Invalid request payload';
            fieldErrors = {};
            for (const msg of obj.message) {
              const field = typeof msg === 'string' ? msg.split(' ')[0] : 'field';
              if (!fieldErrors[field]) {
                fieldErrors[field] = [];
              }
              fieldErrors[field].push(String(msg));
            }
          }
        }
      }
    } else {
      console.error('Unhandled server error:', exception);
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(fieldErrors ? { fieldErrors } : {}),
      },
    });
  }

  private statusCodeToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
