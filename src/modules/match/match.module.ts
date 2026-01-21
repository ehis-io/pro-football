import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { Match } from '../../entities/match.entity';
import { MatchEvent } from '../../entities/match-event.entity';
import { Team } from '../../entities/team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Match, MatchEvent, Team])],
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService],
})
export class MatchModule {}
