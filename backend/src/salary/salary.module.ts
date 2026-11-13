import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SalaryController } from './salary.controller.js';
import { SalaryService } from './salary.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SalaryController],
  providers: [SalaryService],
  exports: [SalaryService],
})
export class SalaryModule {}
