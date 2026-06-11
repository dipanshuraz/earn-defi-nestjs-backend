import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/auth.types';
import { TransactionsQueryDto } from '../dto/transactions-query.dto';
import {
  TransactionResponseDto,
  TransactionsListResponseDto,
} from '../dto/transaction-response.dto';
import { EarnTransactionsService } from '../services/earn-transactions.service';

@ApiTags('earn')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('earn/transactions')
export class EarnTransactionsController {
  constructor(private readonly earnTransactionsService: EarnTransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions for the authenticated user' })
  @ApiOkResponse({ type: TransactionsListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  listTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionsQueryDto,
  ): Promise<TransactionsListResponseDto> {
    return this.earnTransactionsService.listTransactions(user.userId, query);
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse({ description: 'Transaction not found or not owned by user' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  getTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ): Promise<TransactionResponseDto> {
    return this.earnTransactionsService.getTransaction(user.userId, transactionId);
  }
}
