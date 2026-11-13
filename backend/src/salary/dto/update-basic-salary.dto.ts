import { IsInt, IsNotEmpty, Min, ValidateIf } from 'class-validator';

export class UpdateBasicSalaryDto {
  @IsNotEmpty({ message: 'Amount is required' })
  amount!: string;

  @ValidateIf((o) => o.expectedCurrentId !== null)
  @IsInt({ message: 'expectedCurrentId must be an integer or null' })
  @Min(1, { message: 'expectedCurrentId must be at least 1 when provided' })
  expectedCurrentId!: number | null;

  @IsInt({ message: 'expectedVersion must be an integer' })
  @Min(1, { message: 'expectedVersion must be at least 1' })
  expectedVersion!: number;
}
