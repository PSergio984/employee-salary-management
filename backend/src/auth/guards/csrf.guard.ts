import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Safe methods do not mutate state
    if (!MUTATION_METHODS.has(method)) {
      return true;
    }

    // 1. Check custom CSRF header
    const clientHeader = request.headers['x-salary-client'];
    if (clientHeader !== 'web') {
      throw new ForbiddenException({
        error: {
          code: 'CSRF_REJECTED',
          message: 'Missing or invalid X-Salary-Client header',
        },
      });
    }

    // 2. Check Origin / Referer against configured allowed origin
    const allowedOrigin =
      this.configService.get<string>('CLIENT_ORIGIN') || 'http://localhost:5173';

    let requestOrigin = request.headers['origin'];
    if (!requestOrigin) {
      const referer = request.headers['referer'];
      if (referer) {
        try {
          requestOrigin = new URL(referer).origin;
        } catch {
          requestOrigin = undefined;
        }
      }
    }

    if (!requestOrigin || requestOrigin === 'null' || requestOrigin !== allowedOrigin) {
      throw new ForbiddenException({
        error: {
          code: 'CSRF_REJECTED',
          message: 'Origin not allowed or missing',
        },
      });
    }

    // 3. For requests carrying a body, ensure Content-Type is application/json
    const contentLength = request.headers['content-length'];
    const hasBody =
      (contentLength && parseInt(contentLength, 10) > 0) ||
      request.headers['transfer-encoding'] !== undefined;

    if (hasBody && !request.is('application/json')) {
      throw new BadRequestException({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Request body must be application/json',
        },
      });
    }

    return true;
  }
}
