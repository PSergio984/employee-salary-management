import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ArchiveEmployeeDto } from './dto/archive-employee.dto.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { QueryEmployeesDto } from './dto/query-employees.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { EmployeesService } from './employees.service.js';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateEmployeeDto) {
    return this.employeesService.createEmployee(createDto);
  }

  @Get()
  async findAll(@Query() query: QueryEmployeesDto) {
    return this.employeesService.findEmployees(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.findEmployeeById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.updateEmployee(id, updateDto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @Body() archiveDto: ArchiveEmployeeDto,
  ) {
    return this.employeesService.archiveEmployee(id, archiveDto);
  }
}
