import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateEmployeeComponentDto {
  @IsString({ message: 'amount must be a string' })
  @IsNotEmpty({ message: 'amount cannot be empty' })
  amount!: string;

  @IsInt({ message: 'expectedCurrentId must be an integer' })
  @Min(1, { message: 'expectedCurrentId must be a positive integer' })
  expectedCurrentId!: number;

  @IsInt({ message: 'expectedVersion must be an integer' })
  @Min(1, { message: 'expectedVersion must be at least 1' })
  expectedVersion!: number;
}
