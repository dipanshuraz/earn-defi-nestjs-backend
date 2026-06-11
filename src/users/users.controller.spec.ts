import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    getMe: jest.fn(),
  };

  const profile = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    createdAt: new Date('2026-06-11T12:00:00.000Z'),
    updatedAt: new Date('2026-06-11T12:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('returns the authenticated user profile', async () => {
    usersServiceMock.getMe.mockResolvedValue(profile);

    await expect(
      controller.getMe({
        userId: profile.id,
        email: profile.email ?? '',
      }),
    ).resolves.toEqual(profile);

    expect(usersServiceMock.getMe).toHaveBeenCalledWith(profile.id);
  });
});
