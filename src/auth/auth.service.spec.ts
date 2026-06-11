import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { BCRYPT_SALT_ROUNDS } from './auth.types';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };

  const jwtServiceMock = {
    sign: jest.fn().mockReturnValue('signed-jwt-token'),
  };

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    createdAt: new Date('2026-06-11T12:00:00.000Z'),
    updatedAt: new Date('2026-06-11T12:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('creates a user with a hashed password and returns a JWT', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await authService.register({
        email: 'User@Example.com',
        password: 'SecurePass123!',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(
        'SecurePass123!',
        BCRYPT_SALT_ROUNDS,
      );
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: 'user@example.com',
          passwordHash: 'hashed-password',
        },
        select: expect.any(Object),
      });
      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({
        accessToken: 'signed-jwt-token',
        user: mockUser,
      });
    });

    it('throws ConflictException when email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'user@example.com',
          password: 'SecurePass123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a JWT when credentials are valid', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        passwordHash: 'hashed-password',
      });
      prismaMock.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: 'user@example.com',
        password: 'SecurePass123!',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'SecurePass123!',
        'hashed-password',
      );
      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.user).toEqual(mockUser);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'SecurePass123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is invalid', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('returns the user profile without password hash', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(authService.getProfile(mockUser.id)).resolves.toEqual(
        mockUser,
      );
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile(mockUser.id)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
