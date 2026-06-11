import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const authResponse = {
    accessToken: 'signed-jwt-token',
    user: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      createdAt: new Date('2026-06-11T12:00:00.000Z'),
      updatedAt: new Date('2026-06-11T12:00:00.000Z'),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('registers a user', async () => {
    authServiceMock.register.mockResolvedValue(authResponse);

    await expect(
      controller.register({
        email: 'user@example.com',
        password: 'SecurePass123!',
      }),
    ).resolves.toEqual(authResponse);
  });

  it('propagates register conflicts', async () => {
    authServiceMock.register.mockRejectedValue(
      new ConflictException('Email is already registered'),
    );

    await expect(
      controller.register({
        email: 'user@example.com',
        password: 'SecurePass123!',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('logs in a user', async () => {
    authServiceMock.login.mockResolvedValue(authResponse);

    await expect(
      controller.login({
        email: 'user@example.com',
        password: 'SecurePass123!',
      }),
    ).resolves.toEqual(authResponse);
  });

  it('propagates login failures', async () => {
    authServiceMock.login.mockRejectedValue(
      new UnauthorizedException('Invalid email or password'),
    );

    await expect(
      controller.login({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
