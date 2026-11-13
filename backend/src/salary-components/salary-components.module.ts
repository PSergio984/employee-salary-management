import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SalaryComponentsController } from './salary-components.controller.js';
import { SalaryComponentsService } from './salary-components.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [SalaryComponentsController],
  providers: [SalaryComponentsService],
  exports: [SalaryComponentsService],
})
export class SalaryComponentsModule {}
