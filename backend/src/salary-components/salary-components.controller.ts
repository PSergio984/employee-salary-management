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
import { CreateSalaryComponentDto } from './dto/create-salary-component.dto.js';
import { ListSalaryComponentsDto } from './dto/list-salary-components.dto.js';
import { UpdateSalaryComponentDto } from './dto/update-salary-component.dto.js';
import { ArchiveSalaryComponentDto } from './dto/archive-salary-component.dto.js';
import { SalaryComponentsService } from './salary-components.service.js';

@Controller('salary-components')
export class SalaryComponentsController {
  constructor(
    private readonly salaryComponentsService: SalaryComponentsService,
  ) {}

  @Get()
  async list(@Query() query: ListSalaryComponentsDto) {
    return this.salaryComponentsService.list(query);
  }

  @Get(':id/archive-impact')
  async getArchiveImpact(@Param('id', ParseIntPipe) id: number) {
    return this.salaryComponentsService.getArchiveImpact(id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ArchiveSalaryComponentDto,
  ) {
    return this.salaryComponentsService.archive(id, dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.salaryComponentsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSalaryComponentDto) {
    return this.salaryComponentsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSalaryComponentDto,
  ) {
    return this.salaryComponentsService.update(id, dto);
  }
}
