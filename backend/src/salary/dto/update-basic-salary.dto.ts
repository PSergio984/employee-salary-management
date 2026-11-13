import { IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateBasicSalaryDto {
  @IsNotEmpty({ message: 'Amount is required' })
  amount!: string;

  @IsOptional()
  expectedCurrentId?: number | null;

  @IsOptional()
  expectedVersion?: number;
}
