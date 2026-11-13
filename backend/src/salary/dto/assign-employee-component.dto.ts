import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AssignEmployeeComponentDto {
  @IsInt({ message: 'componentId must be an integer' })
  @Min(1, { message: 'componentId must be a positive integer' })
  componentId!: number;

  @IsString({ message: 'amount must be a string' })
  @IsNotEmpty({ message: 'amount cannot be empty' })
  amount!: string;

  @IsInt({ message: 'expectedVersion must be an integer' })
  @Min(1, { message: 'expectedVersion must be at least 1' })
  expectedVersion!: number;
}
