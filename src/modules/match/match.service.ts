import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../../entities/match.entity';
import { MatchEvent } from '../../entities/match-event.entity';
import { MatchEventType } from '../../common/enums/event-type.enum';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchEvent)
    private readonly eventRepository: Repository<MatchEvent>,
  ) {}

  async findAll() {
    return this.matchRepository.find({
      relations: ['homeTeam', 'awayTeam'],
      order: { startTime: 'DESC' },
    });
  }

  async findOne(id: string) {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['homeTeam', 'awayTeam', 'events'],
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    // Calculate statistics from events
    const stats = this.calculateStats(match.events);

    return {
      ...match,
      stats,
    };
  }

  private calculateStats(events: MatchEvent[]) {
    const stats = {
      home: { shots: 0, fouls: 0, yellowCards: 0, redCards: 0 },
      away: { shots: 0, fouls: 0, yellowCards: 0, redCards: 0 },
    };

    events.forEach((event) => {
      const teamType = event.team?.id
        ? event.team.id === event.match?.homeTeam?.id
          ? 'home'
          : 'away'
        : null;
      if (!teamType) return;

      switch (event.type) {
        case MatchEventType.SHOT:
          stats[teamType].shots++;
          break;
        case MatchEventType.FOUL:
          stats[teamType].fouls++;
          break;
        case MatchEventType.YELLOW_CARD:
          stats[teamType].yellowCards++;
          break;
        case MatchEventType.RED_CARD:
          stats[teamType].redCards++;
          break;
      }
    });

    return stats;
  }
}
