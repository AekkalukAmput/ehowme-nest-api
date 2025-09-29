import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({
    example: '2025-09-28 00:00:00',
    description: 'วันที่ (YYYY-MM-DD HH:mm:ss)',
  })
  @IsDateString()
  date!: string; // YYYY-MM-DD

  @ApiProperty({ enum: ['income', 'expense'], example: 'expense' })
  @IsEnum(['income', 'expense'] as const)
  type!: 'income' | 'expense';

  @ApiProperty({ example: 199.5, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @IsPositive()
  amount!: number;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
