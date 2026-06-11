import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthenticatedUser,
  BCRYPT_SALT_ROUNDS,
  JwtPayload,
  USER_PUBLIC_SELECT,
} from './auth.types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
      select: USER_PUBLIC_SELECT,
    });

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.USER_REGISTERED,
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const publicUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: USER_PUBLIC_SELECT,
    });

    await this.auditService.log({
      userId: publicUser.id,
      action: AuditAction.USER_LOGIN,
      entityType: 'user',
      entityId: publicUser.id,
    });

    return this.buildAuthResponse(publicUser);
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  signToken(user: Pick<UserProfileDto, 'id' | 'email'>): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? '',
    };

    return this.jwtService.sign(payload);
  }

  private buildAuthResponse(
    user: Pick<UserProfileDto, 'id' | 'email' | 'createdAt' | 'updatedAt'>,
  ): AuthResponseDto {
    return {
      accessToken: this.signToken(user),
      user,
    };
  }
}

export type { AuthenticatedUser };
