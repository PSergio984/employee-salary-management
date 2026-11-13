import { IsInt, Min } from 'class-validator';

export class RemoveEmployeeComponentDto {
  @IsInt({ message: 'expectedCurrentId must be an integer' })
  @Min(1, { message: 'expectedCurrentId must be a positive integer' })
  expectedCurrentId!: number;

  @IsInt({ message: 'expectedVersion must be an integer' })
  @Min(1, { message: 'expectedVersion must be at least 1' })
  expectedVersion!: number;
}
