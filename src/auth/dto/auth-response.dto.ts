import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: '2026-06-11T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-11T12:00:00.000Z' })
  updatedAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;
}
