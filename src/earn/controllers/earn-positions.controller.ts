import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/auth.types';
import {
  Idempotent,
  IdempotencyOperation,
  IDEMPOTENCY_HEADER,
} from '../../idempotency';
import { PositionDetailResponseDto } from '../dto/position-detail-response.dto';
import { PositionResponseDto } from '../dto/position-response.dto';
import { PositionsQueryDto } from '../dto/positions-query.dto';
import { WithdrawPositionDto } from '../dto/withdraw-position.dto';
import { WithdrawPositionResponseDto } from '../dto/withdraw-position-response.dto';
import { EarnPositionsService } from '../services/earn-positions.service';
import { EarnWithdrawService } from '../services/earn-withdraw.service';

@ApiTags('earn')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('earn/positions')
export class EarnPositionsController {
  constructor(
    private readonly earnPositionsService: EarnPositionsService,
    private readonly earnWithdrawService: EarnWithdrawService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List positions owned by the authenticated user' })
  @ApiOkResponse({ type: PositionResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  listPositions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PositionsQueryDto,
  ): Promise<PositionResponseDto[]> {
    return this.earnPositionsService.listPositions(user.userId, query);
  }

  @Get(':positionId')
  @ApiOperation({ summary: 'Get a position by ID with live share price and current value' })
  @ApiOkResponse({ type: PositionDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Position not found or not owned by user' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  getPosition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('positionId', ParseUUIDPipe) positionId: string,
  ): Promise<PositionDetailResponseDto> {
    return this.earnPositionsService.getPosition(user.userId, positionId);
  }

  @Post(':positionId/withdraw')
  @HttpCode(HttpStatus.CREATED)
  @Idempotent({ operation: IdempotencyOperation.Withdrawal })
  @ApiHeader({
    name: IDEMPOTENCY_HEADER,
    required: true,
    description: 'Unique key for safely retrying withdrawal requests',
    example: '9b5f3c82-7e6d-5f9g-1b2c-4d5e6f7a8b9c',
  })
  @ApiOperation({ summary: 'Submit a partial or full ERC-4626 vault withdrawal' })
  @ApiCreatedResponse({
    type: WithdrawPositionResponseDto,
    description: 'Withdrawal submitted and position updated after confirmation',
  })
  @ApiBadRequestResponse({
    description: 'Invalid amount, inactive position, or insufficient position balance',
  })
  @ApiConflictResponse({ description: 'Withdrawal already in progress for this position' })
  @ApiForbiddenResponse({
    description: 'Mainnet transactions disabled (ALLOW_MAINNET_TRANSACTIONS=false)',
  })
  @ApiNotFoundResponse({ description: 'Position or wallet not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  withdrawPosition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('positionId', ParseUUIDPipe) positionId: string,
    @Body() dto: WithdrawPositionDto,
  ): Promise<WithdrawPositionResponseDto> {
    return this.earnWithdrawService.withdrawPosition(user.userId, positionId, dto);
  }
}
