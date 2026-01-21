import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { MatchEvent } from './match-event.entity';
import { MatchStatus } from '../common/enums/match-status.enum';

export interface MatchDetails {
  halfTimeStart?: number;
  [key: string]: any;
}

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Team, (team) => team.homeMatches)
  homeTeam: Team;

  @ManyToOne(() => Team, (team) => team.awayMatches)
  awayTeam: Team;

  @Column({ default: 0 })
  homeScore: number;

  @Column({ default: 0 })
  awayScore: number;

  @Column({ default: 0 })
  minute: number;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.NOT_STARTED,
  })
  status: MatchStatus;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @OneToMany(() => MatchEvent, (event) => event.match)
  events: MatchEvent[];

  @Column({ type: 'jsonb', nullable: true })
  details: MatchDetails;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
