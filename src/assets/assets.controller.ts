import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { AssetResponseDto } from './dto/asset-response.dto';
import { AssetsQueryDto } from './dto/assets-query.dto';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List supported assets' })
  @ApiOkResponse({
    type: AssetResponseDto,
    isArray: true,
    schema: {
      example: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          chainId: 84532,
          contractAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          decimals: 6,
          isEnabled: true,
        },
      ],
    },
  })
  findAll(@Query() query: AssetsQueryDto): AssetResponseDto[] {
    return this.assetsService.findAll(query);
  }
}
