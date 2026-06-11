import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChainsService } from './chains.service';
import { ChainResponseDto } from './dto/chain-response.dto';
import { ChainsQueryDto } from './dto/chains-query.dto';

@ApiTags('chains')
@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) {}

  @Get()
  @ApiOperation({ summary: 'List supported chains' })
  @ApiOkResponse({
    type: ChainResponseDto,
    isArray: true,
    schema: {
      example: [
        {
          slug: 'base-sepolia',
          name: 'Base Sepolia',
          chainId: 84532,
          isTestnet: true,
          isEnabled: true,
          rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/example',
          explorerUrl: 'https://sepolia.basescan.org',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        },
      ],
    },
  })
  findAll(@Query() query: ChainsQueryDto): ChainResponseDto[] {
    return this.chainsService.findAll(query);
  }
}
