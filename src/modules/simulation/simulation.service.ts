import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Match } from '../../entities/match.entity';
import { MatchEvent } from '../../entities/match-event.entity';
import { MatchStatus } from '../../common/enums/match-status.enum';
import { MatchEventType } from '../../common/enums/event-type.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Team } from '../../entities/team.entity';

@Injectable()
export class MatchSimulationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MatchSimulationService.name);

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchEvent)
    private readonly eventRepository: Repository<MatchEvent>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Match simulation service started');
    await this.seedInitialData();
  }

  private async seedInitialData() {
    const teamCount: { count: string }[] = await this.matchRepository.query(
      'SELECT COUNT(*) FROM teams',
    );
    if (parseInt(teamCount[0].count) > 0) return;

    this.logger.log('Seeding initial data...');

    // Create Teams
    const savedTeams: Team[] = await this.matchRepository.query(
      `INSERT INTO teams (id, name, "shortCode", "logoUrl") VALUES 
      (gen_random_uuid(), 'Arsenal', 'ARS', 'https://example.com/ars.png'),
      (gen_random_uuid(), 'Manchester City', 'MCI', 'https://example.com/mci.png'),
      (gen_random_uuid(), 'Liverpool', 'LIV', 'https://example.com/liv.png'),
      (gen_random_uuid(), 'Chelsea', 'CHE', 'https://example.com/che.png'),
      (gen_random_uuid(), 'Manchester United', 'MUN', 'https://example.com/mun.png')
      RETURNING *`,
    );

    // Create Matches
    for (let i = 0; i < 3; i++) {
      const homeTeam = savedTeams[i];
      const awayTeam = savedTeams[i + 1];
      await this.matchRepository.query(
        `INSERT INTO matches (id, "homeTeamId", "awayTeamId", "homeScore", "awayScore", minute, status, "startTime")
            VALUES (gen_random_uuid(), $1, $2, 0, 0, 0, 'FIRST_HALF', NOW())`,
        [homeTeam.id, awayTeam.id],
      );
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleSimulationTick() {
    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const liveMatches = await this.matchRepository.find({
          where: {
            status: In([
              MatchStatus.FIRST_HALF,
              MatchStatus.SECOND_HALF,
              MatchStatus.HALF_TIME,
            ]),
          },
          relations: ['homeTeam', 'awayTeam'],
        });

        for (const match of liveMatches) {
          await this.processMatchTick(match);
        }
        break; // Success, exit loop
      } catch (error) {
        attempt++;
        if (attempt > maxRetries) {
          this.logger.error(
            `Error during simulation tick after ${maxRetries} retries: ${error.message}`,
          );
        } else {
          this.logger.warn(
             `Simulation tick failed (attempt ${attempt}), retrying in 2s... Error: ${error.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }
  }

  private async processMatchTick(match: Match) {
    if (match.status === MatchStatus.HALF_TIME) {
      // Half time lasts 15 "minutes" (seconds)
      if (!match.details) match.details = { halfTimeStart: match.minute };
      if (match.minute - (match.details.halfTimeStart || 0) >= 15) {
        match.status = MatchStatus.SECOND_HALF;
      }
      match.minute++;
      await this.matchRepository.save(match);
      return;
    }

    if (
      match.status === MatchStatus.FULL_TIME ||
      match.status === MatchStatus.NOT_STARTED
    )
      return;

    match.minute++;

    // Random event generation
    await this.generateRandomEvent(match);

    await this.matchRepository.save(match);
    this.eventEmitter.emit('match.update', match);
    await this.checkMatchLifecycle(match);
  }

  private async generateRandomEvent(match: Match) {
    const p = Math.random();

    // Goal: ~2.5 per match (0.028 per minute)
    if (p < 0.028) {
      const scoringTeam = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
      if (scoringTeam.id === match.homeTeam.id) match.homeScore++;
      else match.awayScore++;
      await this.createEvent(match, MatchEventType.GOAL, scoringTeam);
    }
    // Yellow Card: ~4 per match (0.045 per minute)
    else if (p < 0.073) {
      const team = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
      await this.createEvent(match, MatchEventType.YELLOW_CARD, team);
    }
    // Substitution: ~6 per match (0.066 per minute)
    else if (p < 0.139) {
      const team = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
      await this.createEvent(match, MatchEventType.SUBSTITUTION, team);
    }
    // Foul: ~10 per match (0.11 per minute)
    else if (p < 0.249) {
      const team = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
      await this.createEvent(match, MatchEventType.FOUL, team);
    }
    // Shot: ~12 per match (0.13 per minute)
    else if (p < 0.379) {
      const team = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
      await this.createEvent(match, MatchEventType.SHOT, team);
    }
    // Red Card: ~0.15 per match (0.0016 per minute)
    else if (p < 0.3806) {
      const team = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
      await this.createEvent(match, MatchEventType.RED_CARD, team);
    }
  }

  private async createEvent(match: Match, type: MatchEventType, team?: Team) {
    const players = [
      'Odegaard',
      'Haaland',
      'Salah',
      'Palmer',
      'Saka',
      'Foden',
      'Rodri',
      'Rice',
      'Van Dijk',
      'Saliba',
    ];
    const randomPlayer = players[Math.floor(Math.random() * players.length)];

    const event = this.eventRepository.create({
      match,
      type,
      minute: match.minute,
      team,
      player: randomPlayer,
    });
    await this.eventRepository.save(event);
    this.eventEmitter.emit('match.event', event);
  }

  private async checkMatchLifecycle(match: Match) {
    if (match.minute >= 45 && match.status === MatchStatus.FIRST_HALF) {
      match.status = MatchStatus.HALF_TIME;
      await this.createEvent(match, MatchEventType.PERIOD_END);
    } else if (
      match.minute >= 90 &&
      match.status === MatchStatus.SECOND_HALF
    ) {
      match.status = MatchStatus.FULL_TIME;
      await this.createEvent(match, MatchEventType.PERIOD_END);
    }
  }
}
