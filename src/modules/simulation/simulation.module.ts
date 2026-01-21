import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MatchSimulationService } from './simulation.service';
import { Match } from '../../entities/match.entity';
import { MatchEvent } from '../../entities/match-event.entity';
import { Team } from '../../entities/team.entity';
import { MatchModule } from '../match/match.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, MatchEvent, Team]),
    ScheduleModule.forRoot(),
    MatchModule,
    ChatModule,
  ],
  providers: [MatchSimulationService],
})
export class SimulationModule {}
