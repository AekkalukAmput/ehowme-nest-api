import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateEmailDto } from './dto/update-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200 })
  @Get('me')
  async me(@Req() req: any) {
    return this.users.getById(req.user.sub);
  }

  @ApiOperation({ summary: 'Update my email' })
  @ApiBody({ type: UpdateEmailDto })
  @Patch('me/email')
  async updateEmail(@Req() req: any, @Body() dto: UpdateEmailDto) {
    return this.users.updateEmail(req.user.sub, dto.email);
  }

  @ApiOperation({ summary: 'Change my password (invalidates refresh token)' })
  @ApiBody({ type: ChangePasswordDto })
  @Patch('me/password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    await this.users.changePassword(
      req.user.sub,
      dto.oldPassword,
      dto.newPassword,
    );
    return { success: true, refreshInvalidated: true };
  }

  @ApiOperation({ summary: 'Delete my account' })
  @Delete('me')
  async deleteMe(@Req() req: any) {
    await this.users.deleteUser(req.user.sub);
    return { success: true };
  }
}
