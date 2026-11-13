import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSalaryComponentDto } from './dto/create-salary-component.dto.js';
import { ListSalaryComponentsDto } from './dto/list-salary-components.dto.js';
import { UpdateSalaryComponentDto } from './dto/update-salary-component.dto.js';
import { ArchiveSalaryComponentDto } from './dto/archive-salary-component.dto.js';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ComponentArchiveImpactResponse {
  id: number;
  name: string;
  version: number;
  isActive: boolean;
  affectedEmployeeCount: number;
}

export interface ArchiveSalaryComponentResponse {
  id: number;
  name: string;
  isActive: boolean;
  version: number;
  deactivatedAssignmentsCount: number;
}

@Injectable()
export class SalaryComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes a name for uniqueness checking: trimmed, collapsed whitespace, lowercase.
   */
  normalizeNameKey(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /**
   * Cleans display name: trimmed and normalized internal whitespace.
   */
  cleanDisplayName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  /**
   * Lists salary components with search, status filtering, and deterministic 20-row pagination.
   */
  async list(
    query: ListSalaryComponentsDto,
  ): Promise<PaginatedResult<Prisma.SalaryComponentGetPayload<{}>>> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SalaryComponentWhereInput = {};

    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'archived') {
      where.isActive = false;
    }

    if (query.search && query.search.trim().length > 0) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.salaryComponent.count({ where }),
      this.prisma.salaryComponent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
    };
  }

  /**
   * Retrieves a single component by its primary ID.
   */
  async findById(id: number) {
    const component = await this.prisma.salaryComponent.findUnique({
      where: { id },
    });

    if (!component) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: `Salary component with ID ${id} not found`,
        },
      });
    }

    return component;
  }

  /**
   * Creates a new dynamic salary component definition.
   * Enforces trim/case-insensitive active-name uniqueness at both service and database levels.
   */
  async create(dto: CreateSalaryComponentDto) {
    const name = this.cleanDisplayName(dto.name);
    if (!name) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Component name cannot be blank',
          fieldErrors: { name: ['Component name cannot be blank'] },
        },
      });
    }

    const nameKey = this.normalizeNameKey(name);

    // Explicit active conflict pre-check
    const existing = await this.prisma.salaryComponent.findFirst({
      where: { nameKey, isActive: true },
    });
    if (existing) {
      throw new ConflictException({
        error: {
          code: 'CONFLICT',
          message: `A salary component with name "${name}" already exists`,
        },
      });
    }

    try {
      return await this.prisma.salaryComponent.create({
        data: {
          name,
          nameKey,
          isActive: true,
          version: 1,
        },
      });
    } catch (err: unknown) {
      this.handleDatabaseConstraintError(err, name);
      throw err;
    }
  }

  /**
   * Updates an existing component's name with expected-version optimistic concurrency protection.
   * Same-value renames are no-ops after checking current state.
   */
  async update(id: number, dto: UpdateSalaryComponentDto) {
    const name = this.cleanDisplayName(dto.name);
    if (!name) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Component name cannot be blank',
          fieldErrors: { name: ['Component name cannot be blank'] },
        },
      });
    }

    const component = await this.prisma.salaryComponent.findUnique({
      where: { id },
    });

    if (!component) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: `Salary component with ID ${id} not found`,
        },
      });
    }

    if (!component.isActive) {
      throw new ConflictException({
        error: {
          code: 'COMPONENT_ARCHIVED',
          message: 'Cannot rename or modify an archived salary component definition',
        },
      });
    }

    // Optimistic concurrency check
    if (component.version !== dto.expectedVersion) {
      throw new ConflictException({
        error: {
          code: 'CONFLICT',
          message: `Stale version conflict: component is currently version ${component.version}, but version ${dto.expectedVersion} was expected. Please reload and review before saving.`,
        },
      });
    }

    // Same-value save is a verified no-op
    if (component.name === name) {
      return component;
    }

    const nameKey = this.normalizeNameKey(name);

    // Active duplicate pre-check
    const duplicate = await this.prisma.salaryComponent.findFirst({
      where: {
        nameKey,
        isActive: true,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new ConflictException({
        error: {
          code: 'CONFLICT',
          message: `A salary component with name "${name}" already exists`,
        },
      });
    }

    // Atomic update with version match
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updateResult = await tx.salaryComponent.updateMany({
          where: {
            id,
            version: dto.expectedVersion,
          },
          data: {
            name,
            nameKey,
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictException({
            error: {
              code: 'CONFLICT',
              message:
                'Stale version conflict: component was modified concurrently by another transaction. Please reload and review.',
            },
          });
        }

        return tx.salaryComponent.findUniqueOrThrow({
          where: { id },
        });
      });

      return result;
    } catch (err: unknown) {
      if (err instanceof ConflictException) {
        throw err;
      }
      this.handleDatabaseConstraintError(err, name);
      throw err;
    }
  }

  /**
   * Retrieves preview of archive impact: names definition, current version, and affected employee count.
   * If definition is already archived, rejects with 409 Conflict.
   */
  async getArchiveImpact(id: number): Promise<ComponentArchiveImpactResponse> {
    const component = await this.prisma.salaryComponent.findUnique({
      where: { id },
    });

    if (!component) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: `Salary component with ID ${id} not found`,
        },
      });
    }

    if (!component.isActive) {
      throw new ConflictException({
        error: {
          code: 'COMPONENT_ALREADY_ARCHIVED',
          message: `Salary component "${component.name}" is already archived`,
        },
      });
    }

    // Backend-derived affected employee count: counts all active assignments including archived employees
    const affectedEmployeeCount = await this.prisma.employeeSalaryComponent.count({
      where: {
        componentId: id,
        isActive: true,
      },
    });

    return {
      id: component.id,
      name: component.name,
      version: component.version,
      isActive: component.isActive,
      affectedEmployeeCount,
    };
  }

  /**
   * Archives a shared salary component definition atomically.
   * Coordinates definition-first row lock.
   * Rechecks version and recomputes active assignment count.
   * If expected version or affected count is stale, aborts with 409 Conflict without making mutations.
   * Deactivates ONLY currently active assignments (including for archived employees), preserving amounts and historical rows.
   */
  async archive(
    id: number,
    dto: ArchiveSalaryComponentDto,
  ): Promise<ArchiveSalaryComponentResponse> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Definition-first lock protocol
      const lockedComponents = await tx.$queryRaw<
        Array<{ id: number; name: string; is_active: boolean; version: number }>
      >`
        SELECT id, name, is_active, version
        FROM salary_components
        WHERE id = ${id}
        FOR UPDATE;
      `;

      if (!lockedComponents || lockedComponents.length === 0) {
        throw new NotFoundException({
          error: {
            code: 'NOT_FOUND',
            message: `Salary component with ID ${id} not found`,
          },
        });
      }

      const lockedComp = lockedComponents[0];

      if (!lockedComp.is_active) {
        throw new ConflictException({
          error: {
            code: 'COMPONENT_ALREADY_ARCHIVED',
            message: `Salary component "${lockedComp.name}" is already archived`,
          },
        });
      }

      // 2. Recompute active assignments count within locked transaction
      const currentActiveCount = await tx.employeeSalaryComponent.count({
        where: {
          componentId: id,
          isActive: true,
        },
      });

      // 3. Stale preview checks: version or affected count mismatch rejects with 409
      if (lockedComp.version !== dto.expectedVersion) {
        throw new ConflictException({
          error: {
            code: 'STALE_ARCHIVE_PREVIEW',
            message: `Component version changed: expected version ${dto.expectedVersion}, but current version is ${lockedComp.version}. Please review fresh impact.`,
            currentVersion: lockedComp.version,
            currentAffectedCount: currentActiveCount,
          },
        });
      }

      if (currentActiveCount !== dto.expectedAffectedCount) {
        throw new ConflictException({
          error: {
            code: 'STALE_ARCHIVE_PREVIEW',
            message: `Affected employee count changed: expected ${dto.expectedAffectedCount}, but currently ${currentActiveCount} employees are affected. Please review fresh impact.`,
            currentVersion: lockedComp.version,
            currentAffectedCount: currentActiveCount,
          },
        });
      }

      // 4. Atomic deactivation
      const now = new Date();

      // Deactivate ONLY currently active assignments (including archived employees)
      const deactivationResult = await tx.employeeSalaryComponent.updateMany({
        where: {
          componentId: id,
          isActive: true,
        },
        data: {
          isActive: false,
          endedAt: now,
        },
      });

      // Archive definition and bump version
      const updatedComponent = await tx.salaryComponent.update({
        where: { id },
        data: {
          isActive: false,
          version: { increment: 1 },
        },
      });

      return {
        id: updatedComponent.id,
        name: updatedComponent.name,
        isActive: updatedComponent.isActive,
        version: updatedComponent.version,
        deactivatedAssignmentsCount: deactivationResult.count,
      };
    });
  }

  /**
   * Catches PostgreSQL and Prisma unique constraint violations to return clean 409 Conflict errors.
   */
  private handleDatabaseConstraintError(err: unknown, name: string): void {
    if (!err || typeof err !== 'object') {
      return;
    }

    const errorObj = err as Record<string, unknown>;
    const code = errorObj.code as string | undefined;
    const message = String(errorObj.message || '');

    // Prisma P2002 or Postgres 23505 unique constraint violation
    if (
      code === 'P2002' ||
      code === '23505' ||
      message.includes('salary_components_name_key_active_idx') ||
      message.includes('Unique constraint failed')
    ) {
      throw new ConflictException({
        error: {
          code: 'CONFLICT',
          message: `A salary component with name "${name}" already exists`,
        },
      });
    }
  }
}
