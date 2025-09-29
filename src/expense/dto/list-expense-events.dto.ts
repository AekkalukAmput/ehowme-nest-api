import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class ListExpenseEventsDto {
  @ApiPropertyOptional({ example: '2025-09-01' })
  @IsOptional()
  @IsDateString()
  from?: string; // YYYY-MM-DD

  @ApiPropertyOptional({ example: '2025-09-30' })
  @IsOptional()
  @IsDateString()
  to?: string; // YYYY-MM-DD

  @ApiPropertyOptional({ enum: ['income', 'expense'] })
  @IsOptional()
  @IsEnum(['income', 'expense'] as const)
  type?: 'income' | 'expense';
}
