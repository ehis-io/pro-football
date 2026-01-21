import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Match } from './match.entity';
import { Team } from './team.entity';
import { MatchEventType } from '../common/enums/event-type.enum';

@Entity('match_events')
export class MatchEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Match, (match) => match.events)
  match: Match;

  @Column({
    type: 'enum',
    enum: MatchEventType,
  })
  type: MatchEventType;

  @Column()
  minute: number;

  @ManyToOne(() => Team, { nullable: true })
  team: Team;

  @Column({ nullable: true })
  player: string;

  @Column({ type: 'jsonb', nullable: true })
  details: any;

  @CreateDateColumn()
  createdAt: Date;
}
