import { Module } from '@nestjs/common';
import { PositionsRepository } from './positions.repository';
import { PositionsService } from './positions.service';

@Module({
  providers: [PositionsRepository, PositionsService],
  exports: [PositionsService, PositionsRepository],
})
export class PositionsModule {}
