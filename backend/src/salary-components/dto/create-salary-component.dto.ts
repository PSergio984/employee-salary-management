import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSalaryComponentDto {
  @IsString({ message: 'Component name must be a string' })
  @IsNotEmpty({ message: 'Component name cannot be blank' })
  @MaxLength(100, { message: 'Component name cannot exceed 100 characters' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;
}
