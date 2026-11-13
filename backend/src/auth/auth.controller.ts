import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService, ValidatedUser } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

interface RequestWithSession extends Request {
  user: ValidatedUser;
  sessionInfo: {
    id: string;
    expiresAt: Date;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions() {
    const isSecure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    const cookieName = isSecure ? '__Host-salary_session' : 'salary_session';
    return {
      cookieName,
      options: {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax' as const,
        path: '/',
      },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    }

    const { rawSecret, expiresAt } = await this.authService.createSession(user.id);
    const { cookieName, options } = this.getCookieOptions();

    res.cookie(cookieName, rawSecret, {
      ...options,
      maxAge: 28_800_000, // 8 hours in ms
    });
    res.setHeader('Cache-Control', 'no-store');

    return {
      user: {
        id: user.id,
        username: user.username,
      },
      expiresAt: expiresAt.toISOString(),
    };
  }

  @Get('me')
  async getMe(
    @CurrentUser() user: ValidatedUser,
    @Req() req: RequestWithSession,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return {
      user: {
        id: user.id,
        username: user.username,
      },
      expiresAt: req.sessionInfo.expiresAt.toISOString(),
    };
  }

  @Get('session')
  async getSession(
    @CurrentUser() user: ValidatedUser,
    @Req() req: RequestWithSession,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return {
      user: {
        id: user.id,
        username: user.username,
      },
      expiresAt: req.sessionInfo.expiresAt.toISOString(),
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const { cookieName, options } = this.getCookieOptions();
    const sessionCookie =
      req.cookies?.[cookieName] ||
      req.cookies?.['salary_session'] ||
      req.cookies?.['__Host-salary_session'];

    if (sessionCookie) {
      await this.authService.revokeSession(sessionCookie);
    }

    res.clearCookie(cookieName, options);
    res.setHeader('Cache-Control', 'no-store');
  }
}
