import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateBasicSalaryDto } from './dto/update-basic-salary.dto.js';
import { AssignEmployeeComponentDto } from './dto/assign-employee-component.dto.js';
import { UpdateEmployeeComponentDto } from './dto/update-employee-component.dto.js';
import { RemoveEmployeeComponentDto } from './dto/remove-employee-component.dto.js';
import { calculateRates, SalaryRates } from './utils/rates.js';

export interface BasicSalaryResponse {
  id: number;
  employeeId: number;
  amount: string;
  isActive: boolean;
  recordedAt: string;
  endedAt: string | null;
}

export interface EmployeeComponentResponse {
  id: number;
  employeeId: number;
  componentId: number;
  name: string;
  amount: string;
  isActive: boolean;
  recordedAt: string;
  endedAt: string | null;
  componentIsActive?: boolean;
}

export interface BasicSalarySummaryResponse {
  employeeId: number;
  hasBasicSalary: boolean;
  basicSalary: string | null;
  rates: {
    basic: SalaryRates | null;
    total: SalaryRates | null;
  };
  components: Array<{
    id: number;
    componentId: number;
    name: string;
    amount: string;
    recordedAt?: string;
    isActive?: boolean;
  }>;
  totalMonthlyCompensation: string | null;
}

@Injectable()
export class SalaryService {
  constructor(private readonly prisma: PrismaService) {}

  private canonicalizeAmount(raw: unknown): string {
    if (typeof raw !== 'string') {
      throw new BadRequestException('Amount must be a string');
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new BadRequestException('Amount cannot be empty');
    }
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(trimmed)) {
      throw new BadRequestException(
        'Amount must be a non-negative number with up to 2 decimal places and at most 12 integer digits (e.g., "20000.00")',
      );
    }
    const [whole, frac = ''] = trimmed.split('.');
    const paddedFrac = (frac + '00').slice(0, 2);
    const normalizedWhole = BigInt(whole).toString();
    return `${normalizedWhole}.${paddedFrac}`;
  }

  async getBasicSalary(employeeId: number): Promise<{
    current: BasicSalaryResponse | null;
    employeeVersion: number;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, version: true, isActive: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const assignment = await this.prisma.basicSalaryAssignment.findFirst({
      where: { employeeId, isActive: true },
    });

    return {
      current: assignment
        ? {
            id: assignment.id,
            employeeId: assignment.employeeId,
            amount: new Prisma.Decimal(assignment.amount).toFixed(2),
            isActive: assignment.isActive,
            recordedAt: assignment.recordedAt.toISOString(),
            endedAt: assignment.endedAt ? assignment.endedAt.toISOString() : null,
          }
        : null,
      employeeVersion: employee.version,
    };
  }

  async updateBasicSalary(
    employeeId: number,
    dto: UpdateBasicSalaryDto,
  ): Promise<{
    current: BasicSalaryResponse;
    employeeVersion: number;
  }> {
    const canonicalAmount = this.canonicalizeAmount(dto.amount);

    if (
      dto.expectedVersion === undefined ||
      dto.expectedVersion === null ||
      !Number.isInteger(dto.expectedVersion) ||
      dto.expectedVersion < 1
    ) {
      throw new BadRequestException(
        'expectedVersion is required and must be an integer >= 1',
      );
    }

    if (
      dto.expectedCurrentId !== null &&
      (!Number.isInteger(dto.expectedCurrentId) || dto.expectedCurrentId < 1)
    ) {
      throw new BadRequestException(
        'expectedCurrentId must be an integer >= 1 or null for first assignment',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const lockedEmployees = await tx.$queryRaw<
        Array<{ id: number; version: number; is_active: boolean }>
      >`
        SELECT id, version, is_active
        FROM employees
        WHERE id = ${employeeId}
        FOR UPDATE;
      `;

      if (!lockedEmployees || lockedEmployees.length === 0) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }

      const lockedEmp = lockedEmployees[0];
      if (!lockedEmp.is_active) {
        throw new ConflictException({
          error: {
            code: 'EMPLOYEE_ARCHIVED',
            message: 'Cannot assign or update salary for an archived employee',
          },
        });
      }

      if (lockedEmp.version !== dto.expectedVersion) {
        throw new ConflictException(
          `Employee version conflict: expected version ${dto.expectedVersion}, but found ${lockedEmp.version}`,
        );
      }

      const currentAssignments = await tx.$queryRaw<
        Array<{
          id: number;
          employee_id: number;
          amount: Prisma.Decimal;
          is_active: boolean;
          recorded_at: Date;
          ended_at: Date | null;
        }>
      >`
        SELECT id, employee_id, amount, is_active, recorded_at, ended_at
        FROM basic_salary_assignments
        WHERE employee_id = ${employeeId} AND is_active = true
        FOR UPDATE;
      `;

      const currentAssignment =
        currentAssignments.length > 0 ? currentAssignments[0] : null;

      if (dto.expectedCurrentId === null && currentAssignment !== null) {
        throw new ConflictException(
          'Stale current salary ID: a basic salary already exists for this employee',
        );
      }

      if (
        dto.expectedCurrentId !== null &&
        (currentAssignment === null || currentAssignment.id !== dto.expectedCurrentId)
      ) {
        throw new ConflictException(
          'Stale current salary ID. The record was modified by another request. Please refresh.',
        );
      }

      if (
        currentAssignment &&
        new Prisma.Decimal(currentAssignment.amount).toFixed(2) === canonicalAmount
      ) {
        return {
          current: {
            id: currentAssignment.id,
            employeeId: currentAssignment.employee_id,
            amount: canonicalAmount,
            isActive: true,
            recordedAt: currentAssignment.recorded_at.toISOString(),
            endedAt: currentAssignment.ended_at
              ? currentAssignment.ended_at.toISOString()
              : null,
          },
          employeeVersion: lockedEmp.version,
        };
      }

      const now = new Date();

      if (currentAssignment) {
        await tx.basicSalaryAssignment.update({
          where: { id: currentAssignment.id },
          data: {
            isActive: false,
            endedAt: now,
          },
        });
      }

      const created = await tx.basicSalaryAssignment.create({
        data: {
          employeeId,
          amount: canonicalAmount,
          isActive: true,
          recordedAt: now,
        },
      });

      const nextVersion = lockedEmp.version + 1;
      await tx.employee.update({
        where: { id: employeeId },
        data: { version: nextVersion },
      });

      return {
        current: {
          id: created.id,
          employeeId: created.employeeId,
          amount: canonicalAmount,
          isActive: true,
          recordedAt: created.recordedAt.toISOString(),
          endedAt: null,
        },
        employeeVersion: nextVersion,
      };
    });
  }

  async getBasicSalaryHistory(employeeId: number): Promise<{
    items: BasicSalaryResponse[];
    total: number;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const records = await this.prisma.basicSalaryAssignment.findMany({
      where: { employeeId },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
    });

    return {
      items: records.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        amount: new Prisma.Decimal(r.amount).toFixed(2),
        isActive: r.isActive,
        recordedAt: r.recordedAt.toISOString(),
        endedAt: r.endedAt ? r.endedAt.toISOString() : null,
      })),
      total: records.length,
    };
  }

  // --- TICKET 05: EMPLOYEE COMPONENTS ---

  async getEmployeeComponents(employeeId: number): Promise<{
    items: EmployeeComponentResponse[];
    total: number;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const assignments = await this.prisma.employeeSalaryComponent.findMany({
      where: {
        employeeId,
        isActive: true,
        component: { isActive: true },
      },
      include: { component: true },
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
    });

    return {
      items: assignments.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        componentId: a.componentId,
        name: a.component.name,
        amount: new Prisma.Decimal(a.amount).toFixed(2),
        isActive: a.isActive,
        recordedAt: a.recordedAt.toISOString(),
        endedAt: a.endedAt ? a.endedAt.toISOString() : null,
        componentIsActive: a.component.isActive,
      })),
      total: assignments.length,
    };
  }

  async assignEmployeeComponent(
    employeeId: number,
    dto: AssignEmployeeComponentDto,
  ): Promise<{
    item: EmployeeComponentResponse;
    employeeVersion: number;
  }> {
    const canonicalAmount = this.canonicalizeAmount(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Definition-first lock order to prevent deadlock with global component archive
      const lockedComponents = await tx.$queryRaw<
        Array<{ id: number; name: string; is_active: boolean }>
      >`
        SELECT id, name, is_active
        FROM salary_components
        WHERE id = ${dto.componentId}
        FOR UPDATE;
      `;

      if (!lockedComponents || lockedComponents.length === 0) {
        throw new NotFoundException(`Salary component with ID ${dto.componentId} not found`);
      }
      const lockedComp = lockedComponents[0];
      if (!lockedComp.is_active) {
        throw new BadRequestException({
          error: {
            code: 'COMPONENT_ARCHIVED',
            message: 'Cannot assign an archived salary component definition',
          },
        });
      }

      // 2. Employee lock
      const lockedEmployees = await tx.$queryRaw<
        Array<{ id: number; version: number; is_active: boolean }>
      >`
        SELECT id, version, is_active
        FROM employees
        WHERE id = ${employeeId}
        FOR UPDATE;
      `;

      if (!lockedEmployees || lockedEmployees.length === 0) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }
      const lockedEmp = lockedEmployees[0];
      if (!lockedEmp.is_active) {
        throw new ConflictException({
          error: {
            code: 'EMPLOYEE_ARCHIVED',
            message: 'Cannot assign component to an archived employee',
          },
        });
      }

      if (lockedEmp.version !== dto.expectedVersion) {
        throw new ConflictException({
          code: 'VERSION_CONFLICT',
          message: 'Employee record was modified by another request. Please refresh and review.',
        });
      }

      // 3. Basic salary requirement check (zero qualifies, unassigned rejects)
      const currentBasic = await tx.basicSalaryAssignment.findFirst({
        where: { employeeId, isActive: true },
      });
      if (!currentBasic) {
        throw new BadRequestException(
          'Employee must have an assigned basic salary before assigning salary components',
        );
      }

      // 4. Duplicate active pair check
      const existingActive = await tx.employeeSalaryComponent.findFirst({
        where: { employeeId, componentId: dto.componentId, isActive: true },
      });
      if (existingActive) {
        throw new ConflictException({
          error: {
            code: 'DUPLICATE_ACTIVE_COMPONENT',
            message: `Component "${lockedComp.name}" is already actively assigned to this employee. Please edit the existing assignment instead.`,
          },
        });
      }

      const now = new Date();
      const created = await tx.employeeSalaryComponent.create({
        data: {
          employeeId,
          componentId: dto.componentId,
          amount: canonicalAmount,
          isActive: true,
          recordedAt: now,
        },
      });

      const nextVersion = lockedEmp.version + 1;
      await tx.employee.update({
        where: { id: employeeId },
        data: { version: nextVersion },
      });

      return {
        item: {
          id: created.id,
          employeeId: created.employeeId,
          componentId: created.componentId,
          name: lockedComp.name,
          amount: canonicalAmount,
          isActive: true,
          recordedAt: created.recordedAt.toISOString(),
          endedAt: null,
        },
        employeeVersion: nextVersion,
      };
    });
  }

  async updateEmployeeComponent(
    employeeId: number,
    componentId: number,
    dto: UpdateEmployeeComponentDto,
  ): Promise<{
    item: EmployeeComponentResponse;
    employeeVersion: number;
  }> {
    const canonicalAmount = this.canonicalizeAmount(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Definition-first lock
      const lockedComponents = await tx.$queryRaw<
        Array<{ id: number; name: string; is_active: boolean }>
      >`
        SELECT id, name, is_active
        FROM salary_components
        WHERE id = ${componentId}
        FOR UPDATE;
      `;
      if (!lockedComponents || lockedComponents.length === 0) {
        throw new NotFoundException(`Salary component with ID ${componentId} not found`);
      }
      const lockedComp = lockedComponents[0];
      if (!lockedComp.is_active) {
        throw new BadRequestException({
          error: {
            code: 'COMPONENT_ARCHIVED',
            message: 'Cannot modify assignment of an archived salary component definition',
          },
        });
      }

      // 2. Employee lock
      const lockedEmployees = await tx.$queryRaw<
        Array<{ id: number; version: number; is_active: boolean }>
      >`
        SELECT id, version, is_active
        FROM employees
        WHERE id = ${employeeId}
        FOR UPDATE;
      `;
      if (!lockedEmployees || lockedEmployees.length === 0) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }
      const lockedEmp = lockedEmployees[0];
      if (!lockedEmp.is_active) {
        throw new ConflictException({
          error: {
            code: 'EMPLOYEE_ARCHIVED',
            message: 'Cannot modify component of an archived employee',
          },
        });
      }

      if (lockedEmp.version !== dto.expectedVersion) {
        throw new ConflictException({
          code: 'VERSION_CONFLICT',
          message: 'Employee record was modified by another request. Please refresh and review.',
        });
      }

      // 3. Find active assignment
      const currentAssignment = await tx.employeeSalaryComponent.findFirst({
        where: { employeeId, componentId, isActive: true },
      });
      if (!currentAssignment) {
        throw new NotFoundException(`Active component assignment not found for component ID ${componentId}`);
      }

      if (currentAssignment.id !== dto.expectedCurrentId) {
        throw new ConflictException({
          code: 'STALE_RECORD_CONFLICT',
          message: 'Component assignment was modified by another request. Please refresh and review.',
        });
      }

      // 4. Same-amount no-op
      if (new Prisma.Decimal(currentAssignment.amount).toFixed(2) === canonicalAmount) {
        return {
          item: {
            id: currentAssignment.id,
            employeeId: currentAssignment.employeeId,
            componentId: currentAssignment.componentId,
            name: lockedComp.name,
            amount: canonicalAmount,
            isActive: true,
            recordedAt: currentAssignment.recordedAt.toISOString(),
            endedAt: null,
          },
          employeeVersion: lockedEmp.version,
        };
      }

      // 5. Amount changed: retire old assignment, create new current assignment
      const now = new Date();
      await tx.employeeSalaryComponent.update({
        where: { id: currentAssignment.id },
        data: {
          isActive: false,
          endedAt: now,
        },
      });

      const created = await tx.employeeSalaryComponent.create({
        data: {
          employeeId,
          componentId,
          amount: canonicalAmount,
          isActive: true,
          recordedAt: now,
        },
      });

      const nextVersion = lockedEmp.version + 1;
      await tx.employee.update({
        where: { id: employeeId },
        data: { version: nextVersion },
      });

      return {
        item: {
          id: created.id,
          employeeId: created.employeeId,
          componentId: created.componentId,
          name: lockedComp.name,
          amount: canonicalAmount,
          isActive: true,
          recordedAt: created.recordedAt.toISOString(),
          endedAt: null,
        },
        employeeVersion: nextVersion,
      };
    });
  }

  async removeEmployeeComponent(
    employeeId: number,
    componentId: number,
    dto: RemoveEmployeeComponentDto,
  ): Promise<{
    success: boolean;
    employeeVersion: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Definition-first lock
      const lockedComponents = await tx.$queryRaw<
        Array<{ id: number; name: string; is_active: boolean }>
      >`
        SELECT id, name, is_active
        FROM salary_components
        WHERE id = ${componentId}
        FOR UPDATE;
      `;
      if (!lockedComponents || lockedComponents.length === 0) {
        throw new NotFoundException(`Salary component with ID ${componentId} not found`);
      }

      // 2. Employee lock
      const lockedEmployees = await tx.$queryRaw<
        Array<{ id: number; version: number; is_active: boolean }>
      >`
        SELECT id, version, is_active
        FROM employees
        WHERE id = ${employeeId}
        FOR UPDATE;
      `;
      if (!lockedEmployees || lockedEmployees.length === 0) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }
      const lockedEmp = lockedEmployees[0];
      if (!lockedEmp.is_active) {
        throw new ConflictException({
          error: {
            code: 'EMPLOYEE_ARCHIVED',
            message: 'Cannot remove component from an archived employee',
          },
        });
      }

      if (lockedEmp.version !== dto.expectedVersion) {
        throw new ConflictException({
          code: 'VERSION_CONFLICT',
          message: 'Employee record was modified by another request. Please refresh and review.',
        });
      }

      // 3. Find active assignment
      const currentAssignment = await tx.employeeSalaryComponent.findFirst({
        where: { employeeId, componentId, isActive: true },
      });
      if (!currentAssignment) {
        throw new NotFoundException(`Active component assignment not found for component ID ${componentId}`);
      }

      if (currentAssignment.id !== dto.expectedCurrentId) {
        throw new ConflictException({
          code: 'STALE_RECORD_CONFLICT',
          message: 'Component assignment was modified by another request. Please refresh and review.',
        });
      }

      // 4. Retire assignment (keep historical record)
      const now = new Date();
      await tx.employeeSalaryComponent.update({
        where: { id: currentAssignment.id },
        data: {
          isActive: false,
          endedAt: now,
        },
      });

      const nextVersion = lockedEmp.version + 1;
      await tx.employee.update({
        where: { id: employeeId },
        data: { version: nextVersion },
      });

      return {
        success: true,
        employeeVersion: nextVersion,
      };
    });
  }

  async getEmployeeComponentsHistory(employeeId: number): Promise<{
    items: EmployeeComponentResponse[];
    total: number;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const records = await this.prisma.employeeSalaryComponent.findMany({
      where: { employeeId },
      include: { component: true },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
    });

    return {
      items: records.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        componentId: r.componentId,
        name: r.component.name,
        amount: new Prisma.Decimal(r.amount).toFixed(2),
        isActive: r.isActive,
        recordedAt: r.recordedAt.toISOString(),
        endedAt: r.endedAt ? r.endedAt.toISOString() : null,
        componentIsActive: r.component.isActive,
      })),
      total: records.length,
    };
  }

  // --- RATES & SUMMARY ---

  async getSalarySummary(
    employeeId: number,
  ): Promise<BasicSalarySummaryResponse> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, isActive: true, version: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const currentBasic = await this.prisma.basicSalaryAssignment.findFirst({
      where: { employeeId, isActive: true },
    });

    if (!currentBasic) {
      return {
        employeeId,
        hasBasicSalary: false,
        basicSalary: null,
        rates: {
          basic: null,
          total: null,
        },
        components: [],
        totalMonthlyCompensation: null,
      };
    }

    const basicAmountStr = new Prisma.Decimal(currentBasic.amount).toFixed(2);
    const basicRates = calculateRates(basicAmountStr);

    // Active components tied to active component definitions
    const activeComponents = await this.prisma.employeeSalaryComponent.findMany({
      where: {
        employeeId,
        isActive: true,
        component: { isActive: true },
      },
      include: { component: true },
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
    });

    // Sum monthly cents exactly
    const [basicWhole, basicFrac = ''] = basicAmountStr.split('.');
    let totalCents = BigInt(basicWhole) * 100n + BigInt((basicFrac + '00').slice(0, 2));

    const componentsOutput = activeComponents.map((c) => {
      const amtStr = new Prisma.Decimal(c.amount).toFixed(2);
      const [w, f = ''] = amtStr.split('.');
      totalCents += BigInt(w) * 100n + BigInt((f + '00').slice(0, 2));

      return {
        id: c.id,
        componentId: c.componentId,
        name: c.component.name,
        amount: amtStr,
        recordedAt: c.recordedAt.toISOString(),
        isActive: c.isActive,
      };
    });

    const totalWhole = totalCents / 100n;
    const totalFrac = (totalCents % 100n).toString().padStart(2, '0');
    const totalMonthlyStr = `${totalWhole}.${totalFrac}`;
    const totalRates = calculateRates(totalMonthlyStr);

    return {
      employeeId,
      hasBasicSalary: true,
      basicSalary: basicAmountStr,
      rates: {
        basic: basicRates,
        total: totalRates,
      },
      components: componentsOutput,
      totalMonthlyCompensation: totalMonthlyStr,
    };
  }
}
