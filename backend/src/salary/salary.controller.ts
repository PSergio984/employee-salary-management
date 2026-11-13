import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { UpdateBasicSalaryDto } from './dto/update-basic-salary.dto.js';
import { SalaryService } from './salary.service.js';

@Controller('employees')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Get(':id/basic-salary')
  async getBasicSalary(@Param('id', ParseIntPipe) id: number) {
    return this.salaryService.getBasicSalary(id);
  }

  @Put(':id/basic-salary')
  async updateBasicSalary(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBasicSalaryDto,
  ) {
    return this.salaryService.updateBasicSalary(id, dto);
  }

  @Get(':id/basic-salary/history')
  async getBasicSalaryHistory(@Param('id', ParseIntPipe) id: number) {
    return this.salaryService.getBasicSalaryHistory(id);
  }

  @Get(':id/salary-summary')
  async getSalarySummary(@Param('id', ParseIntPipe) id: number) {
    return this.salaryService.getSalarySummary(id);
  }
}
