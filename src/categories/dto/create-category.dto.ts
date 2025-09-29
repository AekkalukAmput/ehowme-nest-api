import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ enum: ['income', 'expense'] })
  @IsEnum(['income', 'expense'] as const)
  type!: 'income' | 'expense';

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ description: 'หมวดแม่ (ถ้าว่าง = หมวดระดับบนสุด)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
