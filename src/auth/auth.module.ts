import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrivyService } from './privy.service';
import { PrivyAuthGuard } from './guards/privy-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtConfig } from '../config/config.types';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.get<JwtConfig>('jwt');

        if (!jwtConfig?.secret) {
          throw new Error('JWT configuration failed to load');
        }

        return {
          secret: jwtConfig.secret,
          signOptions: {
            expiresIn: jwtConfig.expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrivyService,
    PrivyAuthGuard,
    JwtAuthGuard,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    PrivyService,
    PrivyAuthGuard,
    JwtAuthGuard,
    JwtModule,
  ],
})
export class AuthModule {}
