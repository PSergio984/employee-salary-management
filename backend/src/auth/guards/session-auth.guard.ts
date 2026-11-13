import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { AuthService } from '../auth.service.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const sessionCookie =
      request.cookies?.['salary_session'] ||
      request.cookies?.['__Host-salary_session'];

    if (!sessionCookie) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const activeSession = await this.authService.validateSession(sessionCookie);
    if (!activeSession) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session invalid or expired',
        },
      });
    }

    // Attach user and session context to request
    (request as unknown as { user: unknown }).user = activeSession.adminUser;
    (request as unknown as { sessionInfo: unknown }).sessionInfo = {
      id: activeSession.id,
      expiresAt: activeSession.expiresAt,
    };

    return true;
  }
}
