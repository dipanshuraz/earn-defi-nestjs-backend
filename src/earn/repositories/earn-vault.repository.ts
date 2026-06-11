import { Injectable } from '@nestjs/common';
import { Vault } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProtocolVault } from '../../protocols/earn-protocol.types';

@Injectable()
export class EarnVaultRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrCreate(protocolVault: ProtocolVault): Promise<Vault> {
    return this.prisma.vault.upsert({
      where: { slug: protocolVault.vaultId },
      create: {
        slug: protocolVault.vaultId,
        name: protocolVault.name,
        chainId: protocolVault.chainId,
        contractAddress: protocolVault.contractAddress,
        assetSymbol: protocolVault.assetSymbol,
        assetDecimals: protocolVault.assetDecimals,
        apy: protocolVault.apy,
        isActive: protocolVault.isEnabled,
      },
      update: {
        name: protocolVault.name,
        contractAddress: protocolVault.contractAddress,
        assetSymbol: protocolVault.assetSymbol,
        assetDecimals: protocolVault.assetDecimals,
        apy: protocolVault.apy,
        isActive: protocolVault.isEnabled,
      },
    });
  }
}
