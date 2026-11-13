import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class UpdateSalaryComponentDto {
  @IsString({ message: 'Component name must be a string' })
  @IsNotEmpty({ message: 'Component name cannot be blank' })
  @MaxLength(100, { message: 'Component name cannot exceed 100 characters' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  @Type(() => Number)
  @IsInt({ message: 'Expected version must be an integer' })
  @Min(1, { message: 'Expected version must be at least 1' })
  expectedVersion!: number;
}
