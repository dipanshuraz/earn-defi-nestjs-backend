import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EARN_PROTOCOL_PROVIDER,
  EarnProtocolProvider,
} from '../../protocols/earn-protocol-provider.interface';
import { PositionWithVault } from '../persistence/positions/positions.repository';
import { PositionsService } from '../persistence/positions/positions.service';
import { TransactionsService } from '../persistence/transactions/transactions.service';
import { PositionDetailResponseDto } from '../dto/position-detail-response.dto';
import { PositionResponseDto } from '../dto/position-response.dto';
import { PositionsQueryDto } from '../dto/positions-query.dto';
import { EarnTransactionsService } from './earn-transactions.service';
import { computeCurrentValue } from '../utils/position-value.util';

@Injectable()
export class EarnPositionsService {
  constructor(
    private readonly positionsService: PositionsService,
    private readonly transactionsService: TransactionsService,
    private readonly earnTransactionsService: EarnTransactionsService,
    @Inject(EARN_PROTOCOL_PROVIDER)
    private readonly earnProtocolProvider: EarnProtocolProvider,
  ) {}

  async listPositions(
    userId: string,
    query: PositionsQueryDto = {},
  ): Promise<PositionResponseDto[]> {
    const positions = await this.positionsService.findByUserWithFilters({
      userId,
      vaultSlug: query.vaultId,
      status: query.status,
      walletId: query.walletId,
    });

    return Promise.all(positions.map((position) => this.toResponse(position)));
  }

  async getPosition(userId: string, positionId: string): Promise<PositionDetailResponseDto> {
    const position = await this.positionsService.findByIdWithVault(positionId);

    if (!position || position.userId !== userId) {
      throw new NotFoundException('Position not found');
    }

    const [baseResponse, transactions] = await Promise.all([
      this.toResponse(position),
      this.transactionsService.findByPositionId(positionId),
    ]);

    const transactionsWithVault = transactions.map((transaction) => ({
      ...transaction,
      vaultSlug: transaction.vaultSlug ?? position.vault.slug,
    }));

    return {
      ...baseResponse,
      transactions: this.earnTransactionsService.mapTransactions(transactionsWithVault),
    };
  }

  private async toResponse(position: PositionWithVault): Promise<PositionResponseDto> {
    const protocolVault = await this.earnProtocolProvider.getVault({
      vaultId: position.vault.slug,
      chainId: position.vault.chainId,
    });

    const shares = position.shares.toString();
    const sharePrice = protocolVault.sharePrice;

    return {
      positionId: position.id,
      vaultId: position.vault.slug,
      vaultName: position.vault.name,
      chainId: position.vault.chainId,
      assetSymbol: position.vault.assetSymbol,
      assetDecimals: position.vault.assetDecimals,
      status: position.status,
      depositedAmount: position.depositedAmount.toString(),
      currentAmount: position.currentAmount.toString(),
      shares,
      sharePrice,
      currentValue: computeCurrentValue(
        shares,
        sharePrice,
        position.vault.assetDecimals,
      ),
      createdAt: position.createdAt.toISOString(),
      updatedAt: position.updatedAt.toISOString(),
    };
  }
}
