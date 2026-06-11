import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
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
import { EarnApprovalService } from '../services/earn-approval.service';
import { EarnDepositService } from '../services/earn-deposit.service';
import { EarnService } from '../services/earn.service';
import { ApproveVaultDto } from '../dto/approve-vault.dto';
import { ApproveVaultResponseDto } from '../dto/approve-vault-response.dto';
import { DepositPreviewDto } from '../dto/deposit-preview.dto';
import { DepositPreviewResponseDto } from '../dto/deposit-preview-response.dto';
import { DepositVaultResponseDto } from '../dto/deposit-vault-response.dto';
import { EarnVaultResponseDto } from '../dto/earn-vault-response.dto';
import { EarnVaultsQueryDto } from '../dto/earn-vaults-query.dto';

@ApiTags('earn')
@Controller('earn/vaults')
export class EarnController {
  constructor(
    private readonly earnService: EarnService,
    private readonly earnApprovalService: EarnApprovalService,
    private readonly earnDepositService: EarnDepositService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active earn vaults' })
  @ApiOkResponse({ type: EarnVaultResponseDto, isArray: true })
  listVaults(@Query() query: EarnVaultsQueryDto): Promise<EarnVaultResponseDto[]> {
    return this.earnService.listVaults(query);
  }

  @Get(':vaultId')
  @ApiOperation({ summary: 'Get an earn vault by ID' })
  @ApiOkResponse({ type: EarnVaultResponseDto })
  @ApiNotFoundResponse({ description: 'Vault not found' })
  getVault(
    @Param('vaultId') vaultId: string,
    @Query() query: EarnVaultsQueryDto,
  ): Promise<EarnVaultResponseDto> {
    return this.earnService.getVault(vaultId, query.chainId);
  }

  @Post(':vaultId/deposit/preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview a vault deposit without submitting a transaction' })
  @ApiOkResponse({ type: DepositPreviewResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid amount, inactive vault, or wallet chain mismatch',
  })
  @ApiNotFoundResponse({ description: 'Vault or wallet not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  previewDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vaultId') vaultId: string,
    @Body() dto: DepositPreviewDto,
  ): Promise<DepositPreviewResponseDto> {
    return this.earnService.previewDeposit(user.userId, vaultId, dto);
  }

  @Post(':vaultId/approve')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @Idempotent({ operation: IdempotencyOperation.Approval })
  @ApiBearerAuth()
  @ApiHeader({
    name: IDEMPOTENCY_HEADER,
    required: true,
    description: 'Unique key for safely retrying approval requests',
    example: '7f3e2a91-5c4b-4d8e-9f0a-1b2c3d4e5f6a',
  })
  @ApiOperation({ summary: 'Submit an ERC-20 approval for a vault deposit' })
  @ApiCreatedResponse({
    type: ApproveVaultResponseDto,
    description: 'Approval submitted or already satisfied',
    schema: {
      example: {
        vaultId: 'aave-base-sepolia-usdc',
        chainId: 84532,
        walletId: '550e8400-e29b-41d4-a716-446655440000',
        amount: '1000000',
        allowance: '1000000',
        requiresApproval: false,
        status: 'CONFIRMED',
        transactionId: 'f8b3c2a1-4d5e-6f7a-8b9c-0d1e2f3a4b5c',
        txHash:
          '0xabc123def4567890123456789012345678901234567890123456789012345678',
        blockNumber: '18450321',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid amount, inactive vault, wallet mismatch, or native asset',
  })
  @ApiForbiddenResponse({
    description: 'Mainnet transactions disabled (ALLOW_MAINNET_TRANSACTIONS=false)',
  })
  @ApiNotFoundResponse({ description: 'Vault or wallet not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  approveVault(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vaultId') vaultId: string,
    @Body() dto: ApproveVaultDto,
  ): Promise<ApproveVaultResponseDto> {
    return this.earnApprovalService.approveVault(user.userId, vaultId, dto);
  }

  @Post(':vaultId/deposit')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @Idempotent({ operation: IdempotencyOperation.Deposit })
  @ApiBearerAuth()
  @ApiHeader({
    name: IDEMPOTENCY_HEADER,
    required: true,
    description: 'Unique key for safely retrying deposit requests',
    example: '8a4f2b91-6d5c-4e8f-0a1b-2c3d4e5f6a7b',
  })
  @ApiOperation({ summary: 'Submit an ERC-4626 vault deposit transaction' })
  @ApiCreatedResponse({
    type: DepositVaultResponseDto,
    description: 'Deposit submitted and position updated after confirmation',
    schema: {
      example: {
        vaultId: 'aave-base-sepolia-usdc',
        chainId: 84532,
        walletId: '550e8400-e29b-41d4-a716-446655440000',
        amount: '1000000',
        walletBalance: '5000000',
        allowance: '1000000',
        positionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        positionStatus: 'ACTIVE',
        depositedAmount: '1000000',
        shares: '980392156862745098',
        transactionId: 'f8b3c2a1-4d5e-6f7a-8b9c-0d1e2f3a4b5c',
        status: 'CONFIRMED',
        txHash:
          '0xabc123def4567890123456789012345678901234567890123456789012345678',
        blockNumber: '18450321',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Insufficient balance/allowance, inactive vault, or wallet mismatch',
  })
  @ApiForbiddenResponse({
    description: 'Mainnet transactions disabled (ALLOW_MAINNET_TRANSACTIONS=false)',
  })
  @ApiNotFoundResponse({ description: 'Vault or wallet not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  depositVault(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vaultId') vaultId: string,
    @Body() dto: DepositPreviewDto,
  ): Promise<DepositVaultResponseDto> {
    return this.earnDepositService.depositVault(user.userId, vaultId, dto);
  }
}
