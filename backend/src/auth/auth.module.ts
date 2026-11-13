import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, CsrfGuard],
  exports: [AuthService, SessionAuthGuard, CsrfGuard],
})
export class AuthModule {}
