import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListSalaryComponentsDto {
  @IsOptional()
  @IsString({ message: 'Search query must be a string' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  search?: string;

  @IsOptional()
  @IsIn(['active', 'archived', 'all'], {
    message: 'Status must be one of: active, archived, all',
  })
  status?: 'active' | 'archived' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page size must be an integer' })
  @Min(1, { message: 'Page size must be at least 1' })
  @Max(100, { message: 'Page size cannot exceed 100' })
  pageSize?: number = 20;
}
