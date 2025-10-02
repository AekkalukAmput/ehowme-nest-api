import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CreateExpenseItemDto } from 'src/expense-item/dto/create-expense-item.dto';

export class CreateExpenseDto {
  @ApiProperty({
    example: '2025-09-28 00:00:00',
    description: 'วันที่ (YYYY-MM-DD HH:mm:ss)',
  })
  @IsDateString()
  startProjectDate!: string; // YYYY-MM-DD

  @ApiProperty({ enum: ['income', 'expense'], example: 'expense' })
  @IsEnum(['income', 'expense'] as const)
  type!: 'income' | 'expense';

  @ApiProperty({ example: 199.5, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @IsPositive()
  amount!: number;

  @ApiProperty({ required: true, maxLength: 100 })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: true, maxLength: 50 })
  @IsString()
  @MaxLength(50)
  orderNo: string;

  @ApiProperty({ required: true, maxLength: 200 })
  @IsString()
  @MaxLength(200)
  websiteName: string;

  @ApiProperty({ required: false, maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @ApiProperty({ required: false, maxLength: 12 })
  @IsString()
  @IsOptional()
  @MaxLength(12)
  telNo?: string;

  @ApiProperty({
    required: true,
    enum: ['individual', 'company'],
    example: 'individual',
  })
  @IsString()
  @IsEnum(['individual', 'company'] as const)
  customerType!: 'individual' | 'company';

  @ApiProperty({
    example: 3,
    minimum: 0,
    maximum: 100,
    description: 'อัตราภาษีหัก ณ ที่จ่าย',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsPositive()
  withholdingTaxPercent!: number;

  @ApiProperty({
    example: 199.5,
    minimum: 0.01,
    description: 'จำนวนภาษีหัก ณ ที่จ่าย',
  })
  @IsNumber()
  @Min(0.01)
  @IsPositive()
  withholdingTaxAmount!: number;

  @ApiProperty({
    example: 10,
    minimum: 0,
    maximum: 100,
    description: 'อัตราค่าธรรมเนียมบริการ',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsPositive()
  serviceFeePercent!: number;

  @ApiProperty({
    example: 199.5,
    minimum: 0.01,
    description: 'จำนวนค่าธรรมเนียมบริการ',
  })
  @IsNumber()
  @Min(0.01)
  @IsPositive()
  serviceFeeAmount!: number;

  @ApiProperty({
    type: () => [Object],
    description: 'รายการค่าใช้จ่าย',
    required: false,
  })
  @IsOptional()
  @IsPositive({ each: true })
  @IsNumber({}, { each: true })
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  expenseItems?: CreateExpenseItemDto[];
}
