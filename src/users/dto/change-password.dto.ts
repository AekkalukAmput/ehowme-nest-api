import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassw0rd!' })
  @IsString()
  @MinLength(8)
  oldPassword!: string;

  @ApiProperty({ example: 'newPassw0rd!' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
