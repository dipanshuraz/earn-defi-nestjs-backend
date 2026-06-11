import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UserProfileDto } from '../auth/dto/auth-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly authService: AuthService) {}

  getMe(userId: string): Promise<UserProfileDto> {
    return this.authService.getProfile(userId);
  }
}
