import { Controller, Get, Param, Sse, MessageEvent } from '@nestjs/common';
import { MatchService } from './match.service';
import { Observable, fromEvent, map, filter } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiTags } from '@nestjs/swagger';

import { MatchEvent } from '../../entities/match-event.entity';

@ApiTags('matches')
@Controller('api/matches')
export class MatchController {
  constructor(
    private readonly matchService: MatchService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  async findAll() {
    return this.matchService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.matchService.findOne(id);
  }

  @Sse(':id/events/stream')
  streamEvents(@Param('id') id: string): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'match.event').pipe(
      filter((event: MatchEvent) => event.match?.id === id),
      map((event: MatchEvent) => ({ data: event }) as MessageEvent),
    );
  }
}
