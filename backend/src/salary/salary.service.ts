import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateBasicSalaryDto } from './dto/update-basic-salary.dto.js';
import { calculateRates, SalaryRates } from './utils/rates.js';

export interface BasicSalaryResponse {
  id: number;
  employeeId: number;
  amount: string;
  isActive: boolean;
  recordedAt: string;
  endedAt: string | null;
}

export interface BasicSalarySummaryResponse {
  employeeId: number;
  hasBasicSalary: boolean;
  basicSalary: string | null;
  rates: {
    basic: SalaryRates | null;
    total: SalaryRates | null;
  };
  components: Array<unknown>;
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

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch and lock employee row
      const employees = await tx.$queryRaw<
        Array<{ id: number; is_active: boolean; version: number }>
      >`
        SELECT id, is_active, version FROM "employees" WHERE id = ${employeeId} FOR UPDATE
      `;
      if (!employees || employees.length === 0) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }
      const emp = employees[0];
      if (!emp.is_active) {
        throw new ConflictException(
          'Cannot assign or update salary for an archived employee',
        );
      }
      if (
        dto.expectedVersion !== undefined &&
        emp.version !== dto.expectedVersion
      ) {
        throw new ConflictException(
          `Employee version conflict: expected version ${dto.expectedVersion}, but found ${emp.version}`,
        );
      }

      // 2. Fetch current active basic salary assignment with FOR UPDATE
      const currentAssignments = await tx.$queryRaw<
        Array<{
          id: number;
          employee_id: number;
          amount: string;
          is_active: boolean;
          recorded_at: Date;
          ended_at: Date | null;
        }>
      >`
        SELECT id, employee_id, amount::text, is_active, recorded_at, ended_at
        FROM "basic_salary_assignments"
        WHERE employee_id = ${employeeId} AND is_active = true
        FOR UPDATE
      `;
      const current =
        currentAssignments.length > 0 ? currentAssignments[0] : null;

      // 3. Concurrency check on expectedCurrentId
      if (dto.expectedCurrentId !== undefined) {
        if (current === null) {
          if (dto.expectedCurrentId !== null) {
            throw new ConflictException(
              `Expected current salary ID ${dto.expectedCurrentId}, but employee has no current salary assignment`,
            );
          }
        } else {
          if (dto.expectedCurrentId !== current.id) {
            throw new ConflictException(
              `Stale current salary ID: expected ${dto.expectedCurrentId}, but current is ${current.id}`,
            );
          }
        }
      }

      // 4. Same-amount save is a no-op
      if (current !== null) {
        const currentAmountFormatted = new Prisma.Decimal(current.amount).toFixed(2);
        if (currentAmountFormatted === canonicalAmount) {
          return {
            current: {
              id: current.id,
              employeeId: current.employee_id,
              amount: currentAmountFormatted,
              isActive: current.is_active,
              recordedAt: current.recorded_at.toISOString(),
              endedAt: current.ended_at
                ? current.ended_at.toISOString()
                : null,
            },
            employeeVersion: emp.version,
          };
        }
      }

      // 5. Retire old assignment if exists
      const now = new Date();
      if (current !== null) {
        await tx.$executeRaw`
          UPDATE "basic_salary_assignments"
          SET is_active = false, ended_at = ${now}
          WHERE id = ${current.id}
        `;
      }

      // 6. Insert new assignment
      const inserted = await tx.$queryRaw<
        Array<{
          id: number;
          employee_id: number;
          amount: string;
          is_active: boolean;
          recorded_at: Date;
          ended_at: Date | null;
        }>
      >`
        INSERT INTO "basic_salary_assignments" (employee_id, amount, is_active, recorded_at, ended_at)
        VALUES (${employeeId}, ${canonicalAmount}::numeric(14,2), true, ${now}, NULL)
        RETURNING id, employee_id, amount::text, is_active, recorded_at, ended_at
      `;
      const newAssignment = inserted[0];

      // 7. Increment employee version
      const updatedEmp = await tx.$queryRaw<Array<{ version: number }>>`
        UPDATE "employees"
        SET version = version + 1, updated_at = ${now}
        WHERE id = ${employeeId}
        RETURNING version
      `;

      return {
        current: {
          id: newAssignment.id,
          employeeId: newAssignment.employee_id,
          amount: new Prisma.Decimal(newAssignment.amount).toFixed(2),
          isActive: newAssignment.is_active,
          recordedAt: newAssignment.recorded_at.toISOString(),
          endedAt: null,
        },
        employeeVersion: updatedEmp[0].version,
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
      };
    }

    const basicAmountStr = new Prisma.Decimal(currentBasic.amount).toFixed(2);
    const basicRates = calculateRates(basicAmountStr);

    return {
      employeeId,
      hasBasicSalary: true,
      basicSalary: basicAmountStr,
      rates: {
        basic: basicRates,
        total: basicRates,
      },
      components: [],
    };
  }
}
