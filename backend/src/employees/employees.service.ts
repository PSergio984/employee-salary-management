import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { QueryEmployeesDto } from './dto/query-employees.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';

export interface FormattedEmployee {
  id: number;
  employeeId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateHired: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedEmployees {
  items: FormattedEmployee[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const NAME_REGEX = /^[\p{L}\p{M}][\p{L}\p{M}\s'-]*$/u;

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeEmployeeIdKey(id: string): string {
    return id.trim().toUpperCase();
  }

  getTodayInManila(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  validateDateHired(dateStr: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_HIRE_DATE',
          message: 'Date hired must be in YYYY-MM-DD format',
        },
      });
    }

    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    const testDate = new Date(Date.UTC(year, month - 1, day));
    if (
      testDate.getUTCFullYear() !== year ||
      testDate.getUTCMonth() !== month - 1 ||
      testDate.getUTCDate() !== day
    ) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_HIRE_DATE',
          message: 'Invalid calendar date for date hired',
        },
      });
    }

    const todayManila = this.getTodayInManila();
    if (dateStr > todayManila) {
      throw new BadRequestException({
        error: {
          code: 'FUTURE_HIRE_DATE',
          message: `Date hired cannot be in the future (today in Manila: ${todayManila})`,
        },
      });
    }

    return testDate;
  }

  validateName(name: string, field: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_NAME',
          message: `${field} cannot be empty`,
        },
      });
    }

    if (!NAME_REGEX.test(trimmed)) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_NAME',
          message: `${field} contains invalid characters. Letters, spaces, hyphens, and apostrophes are allowed.`,
        },
      });
    }

    return trimmed;
  }

  formatEmployee(emp: {
    id: number;
    employeeId: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateHired: Date;
    isActive: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): FormattedEmployee {
    const dateHiredStr = emp.dateHired.toISOString().split('T')[0];
    return {
      id: emp.id,
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      middleName: emp.middleName,
      lastName: emp.lastName,
      dateHired: dateHiredStr,
      isActive: emp.isActive,
      version: emp.version,
      createdAt: emp.createdAt.toISOString(),
      updatedAt: emp.updatedAt.toISOString(),
    };
  }

  async createEmployee(dto: CreateEmployeeDto): Promise<FormattedEmployee> {
    const trimmedId = dto.employeeId.trim();
    if (!trimmedId) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_EMPLOYEE_ID',
          message: 'Employee ID is required',
        },
      });
    }

    const employeeIdKey = this.normalizeEmployeeIdKey(trimmedId);
    const firstName = this.validateName(dto.firstName, 'First name');
    const lastName = this.validateName(dto.lastName, 'Last name');
    const middleName = dto.middleName?.trim()
      ? this.validateName(dto.middleName, 'Middle name')
      : null;
    const dateHired = this.validateDateHired(dto.dateHired);

    // Uniqueness check across active and archived records
    const existing = await this.prisma.employee.findUnique({
      where: { employeeIdKey },
    });

    if (existing) {
      throw new ConflictException({
        error: {
          code: 'DUPLICATE_EMPLOYEE_ID',
          message: `Employee ID "${trimmedId}" already exists.`,
        },
      });
    }

    try {
      const created = await this.prisma.employee.create({
        data: {
          employeeId: trimmedId,
          employeeIdKey,
          firstName,
          middleName,
          lastName,
          dateHired,
          isActive: true,
          version: 1,
        },
      });

      return this.formatEmployee(created);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException({
          error: {
            code: 'DUPLICATE_EMPLOYEE_ID',
            message: `Employee ID "${trimmedId}" already exists.`,
          },
        });
      }
      throw err;
    }
  }

  async findEmployees(query: QueryEmployeesDto): Promise<PaginatedEmployees> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));

    const where: Prisma.EmployeeWhereInput = {};

    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'archived') {
      where.isActive = false;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { employeeId: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { middleName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
          { id: 'asc' },
        ],
      }),
    ]);

    return {
      items: items.map((emp) => this.formatEmployee(emp)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async findEmployeeById(id: number): Promise<FormattedEmployee> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException({
        error: {
          code: 'EMPLOYEE_NOT_FOUND',
          message: `Employee with ID ${id} was not found`,
        },
      });
    }

    return this.formatEmployee(employee);
  }

  async updateEmployee(
    id: number,
    dto: UpdateEmployeeDto,
  ): Promise<FormattedEmployee> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException({
        error: {
          code: 'EMPLOYEE_NOT_FOUND',
          message: `Employee with ID ${id} was not found`,
        },
      });
    }

    // Optimistic Concurrency Control: reject stale edits
    if (employee.version !== dto.expectedVersion) {
      throw new ConflictException({
        error: {
          code: 'VERSION_CONFLICT',
          message:
            'Employee record has been modified by another request. Please reload and review the latest changes.',
        },
      });
    }

    const updateData: Prisma.EmployeeUpdateInput = {
      version: { increment: 1 },
    };

    if (dto.employeeId !== undefined) {
      const trimmedId = dto.employeeId.trim();
      if (!trimmedId) {
        throw new BadRequestException({
          error: {
            code: 'INVALID_EMPLOYEE_ID',
            message: 'Employee ID cannot be empty',
          },
        });
      }
      const newKey = this.normalizeEmployeeIdKey(trimmedId);
      if (newKey !== employee.employeeIdKey) {
        const existingKey = await this.prisma.employee.findUnique({
          where: { employeeIdKey: newKey },
        });
        if (existingKey && existingKey.id !== id) {
          throw new ConflictException({
            error: {
              code: 'DUPLICATE_EMPLOYEE_ID',
              message: `Employee ID "${trimmedId}" already exists.`,
            },
          });
        }
      }
      updateData.employeeId = trimmedId;
      updateData.employeeIdKey = newKey;
    }

    if (dto.firstName !== undefined) {
      updateData.firstName = this.validateName(dto.firstName, 'First name');
    }

    if (dto.lastName !== undefined) {
      updateData.lastName = this.validateName(dto.lastName, 'Last name');
    }

    if (dto.middleName !== undefined) {
      updateData.middleName = dto.middleName?.trim()
        ? this.validateName(dto.middleName, 'Middle name')
        : null;
    }

    if (dto.dateHired !== undefined) {
      updateData.dateHired = this.validateDateHired(dto.dateHired);
    }

    try {
      const updated = await this.prisma.employee.update({
        where: { id },
        data: updateData,
      });

      return this.formatEmployee(updated);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException({
          error: {
            code: 'DUPLICATE_EMPLOYEE_ID',
            message: `Employee ID already exists.`,
          },
        });
      }
      throw err;
    }
  }
}
