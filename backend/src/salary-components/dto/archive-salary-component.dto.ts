import { Transform, Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ArchiveSalaryComponentDto {
  @Type(() => Number)
  @IsInt({ message: 'expectedVersion must be an integer' })
  @Min(1, { message: 'expectedVersion must be at least 1' })
  expectedVersion!: number;

  @Transform(({ value, obj }: { value: unknown; obj: Record<string, unknown> }) => {
    const raw = value !== undefined ? value : obj.expectedCount;
    return typeof raw === 'string' ? parseInt(raw, 10) : raw;
  })
  @Type(() => Number)
  @IsInt({ message: 'expectedAffectedCount must be an integer' })
  @Min(0, { message: 'expectedAffectedCount must be at least 0' })
  expectedAffectedCount!: number;
}
