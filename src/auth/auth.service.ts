import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { Tokens } from './types/tokens.type';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  private async signTokens(userId: string, email: string): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
        },
      ),
      this.jwt.signAsync(
        { sub: userId, email },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  async register(email: string, password: string) {
    const existed = await this.users.findByEmail(email);
    if (existed) throw new BadRequestException('Email already registered');
    const user = await this.users.create(email, password);
    const tokens = await this.signTokens(user.id, user.email);
    await this.users.setRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const tokens = await this.signTokens(user.id, user.email);
    await this.users.setRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async refresh(userId: string, refreshToken: string) {
    const valid = await this.users.validateRefreshToken(userId, refreshToken);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    const payload: any = this.jwt.decode(refreshToken);
    if (!payload?.email)
      throw new UnauthorizedException('Invalid token payload');

    const user = await this.users.findByEmail(payload.email);
    if (!user) throw new UnauthorizedException('User not found');

    const tokens = await this.signTokens(user.id, user.email);
    await this.users.setRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    await this.users.setRefreshToken(userId, null);
    return { success: true };
  }
}
