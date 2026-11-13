import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { UpdateBasicSalaryDto } from './dto/update-basic-salary.dto.js';
import { AssignEmployeeComponentDto } from './dto/assign-employee-component.dto.js';
import { UpdateEmployeeComponentDto } from './dto/update-employee-component.dto.js';
import { RemoveEmployeeComponentDto } from './dto/remove-employee-component.dto.js';
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

  // --- TICKET 05: EMPLOYEE SALARY COMPONENTS ---

  @Get(':id/components')
  async getEmployeeComponents(@Param('id', ParseIntPipe) id: number) {
    return this.salaryService.getEmployeeComponents(id);
  }

  @Post(':id/components')
  async assignEmployeeComponent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignEmployeeComponentDto,
  ) {
    return this.salaryService.assignEmployeeComponent(id, dto);
  }

  @Put(':id/components/:componentId')
  async updateEmployeeComponent(
    @Param('id', ParseIntPipe) id: number,
    @Param('componentId', ParseIntPipe) componentId: number,
    @Body() dto: UpdateEmployeeComponentDto,
  ) {
    return this.salaryService.updateEmployeeComponent(id, componentId, dto);
  }

  @Post(':id/components/:componentId/remove')
  @HttpCode(HttpStatus.OK)
  async removeEmployeeComponent(
    @Param('id', ParseIntPipe) id: number,
    @Param('componentId', ParseIntPipe) componentId: number,
    @Body() dto: RemoveEmployeeComponentDto,
  ) {
    return this.salaryService.removeEmployeeComponent(id, componentId, dto);
  }

  @Get(':id/components/history')
  async getEmployeeComponentsHistory(@Param('id', ParseIntPipe) id: number) {
    return this.salaryService.getEmployeeComponentsHistory(id);
  }
}
