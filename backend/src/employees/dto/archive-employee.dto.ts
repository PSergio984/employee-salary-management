import { IsInt, Min } from 'class-validator';

export class ArchiveEmployeeDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
