export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export const BCRYPT_SALT_ROUNDS = 12;

export const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const;
