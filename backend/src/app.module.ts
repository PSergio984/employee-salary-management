import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { SalaryModule } from './salary/salary.module.js';
import { CsrfGuard } from './auth/guards/csrf.guard.js';
import { SessionAuthGuard } from './auth/guards/session-auth.guard.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SalaryComponentsModule } from './salary-components/salary-components.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    SalaryModule,
    SalaryComponentsModule,
  ],
  providers: [
    // CsrfGuard validates origin and X-Salary-Client header on mutations first
    { provide: APP_GUARD, useClass: CsrfGuard },
    // SessionAuthGuard validates session cookie and attaches user context
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    // Structured error envelope for all exceptions
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
