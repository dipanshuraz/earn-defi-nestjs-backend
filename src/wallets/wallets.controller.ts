import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { MintTestUsdcResponseDto } from './dto/mint-test-usdc-response.dto';
import { CreateWalletDto, WalletBalanceDto, WalletResponseDto } from './dto/wallet.dto';
import { WalletsService } from './wallets.service';

@ApiTags('wallets')
@ApiBearerAuth()
@ApiExtraModels(WalletResponseDto, WalletBalanceDto)
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a Privy-backed wallet for the authenticated user' })
  @ApiCreatedResponse({
    schema: {
      example: {
        walletId: '550e8400-e29b-41d4-a716-446655440000',
        privyWalletId: 'cmqwallet123abc456',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chainId: 84532,
        walletType: 'EMBEDDED',
        isPrimary: true,
        createdAt: '2026-06-11T12:00:00.000Z',
        updatedAt: '2026-06-11T12:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  createWallet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWalletDto,
  ): Promise<WalletResponseDto> {
    return this.walletsService.createWallet(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List wallets owned by the authenticated user with live balances' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        allOf: [
          { $ref: getSchemaPath(WalletResponseDto) },
          {
            properties: {
              balance: { $ref: getSchemaPath(WalletBalanceDto) },
              balances: {
                type: 'array',
                items: { $ref: getSchemaPath(WalletBalanceDto) },
              },
            },
          },
        ],
      },
      example: [
        {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          privyWalletId: 'cmqwallet123abc456',
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
          chainId: 84532,
          walletType: 'EMBEDDED',
          isPrimary: true,
          createdAt: '2026-06-11T12:00:00.000Z',
          updatedAt: '2026-06-11T12:00:00.000Z',
          balance: {
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            chainId: 84532,
            balance: '1000000000000000',
            symbol: 'ETH',
            decimals: 18,
          },
          balances: [
            {
              address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
              chainId: 84532,
              balance: '1000000000000000',
              symbol: 'ETH',
              decimals: 18,
            },
            {
              address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
              chainId: 84532,
              balance: '5000000',
              symbol: 'USDC',
              decimals: 6,
            },
          ],
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  listWallets(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WalletResponseDto[]> {
    return this.walletsService.listWallets(user.userId);
  }

  @Get(':walletId')
  @ApiOperation({ summary: 'Get a wallet by ID with live Privy balance' })
  @ApiOkResponse({
    schema: {
      allOf: [
        { $ref: getSchemaPath(WalletResponseDto) },
        {
          properties: {
            balance: { $ref: getSchemaPath(WalletBalanceDto) },
          },
        },
      ],
      example: {
        walletId: '550e8400-e29b-41d4-a716-446655440000',
        privyWalletId: 'cmqwallet123abc456',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chainId: 84532,
        walletType: 'EMBEDDED',
        isPrimary: true,
        createdAt: '2026-06-11T12:00:00.000Z',
        updatedAt: '2026-06-11T12:00:00.000Z',
        balance: {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
          chainId: 84532,
          balance: '1000000000000000',
          symbol: 'ETH',
          decimals: 18,
        },
        balances: [
          {
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            chainId: 84532,
            balance: '1000000000000000',
            symbol: 'ETH',
            decimals: 18,
          },
          {
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            chainId: 84532,
            balance: '5000000',
            symbol: 'USDC',
            decimals: 6,
          },
        ],
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Wallet not found or not owned by user' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  getWallet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ): Promise<WalletResponseDto> {
    return this.walletsService.getWallet(user.userId, walletId);
  }

  @Post(':walletId/enable-server-signing')
  @ApiOperation({
    summary:
      'Verify this wallet can be signed by the configured Privy key quorum (user-owned wallets require a new wallet)',
  })
  @ApiCreatedResponse({ type: WalletResponseDto })
  enableServerSigning(
    @CurrentUser() user: AuthenticatedUser,
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ): Promise<WalletResponseDto> {
    return this.walletsService.enableServerSigning(user.userId, walletId);
  }

  @Post(':walletId/faucet/aave-usdc')
  @ApiOperation({
    summary: 'Mint Aave test USDC on Base Sepolia (local/dev only, max 1 USDC/hour)',
  })
  @ApiCreatedResponse({ type: MintTestUsdcResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  mintAaveTestUsdc(
    @CurrentUser() user: AuthenticatedUser,
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ): Promise<MintTestUsdcResponseDto> {
    return this.walletsService.mintAaveTestUsdc(user.userId, walletId);
  }
}
