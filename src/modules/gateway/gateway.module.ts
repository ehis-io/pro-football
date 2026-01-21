import { Module } from '@nestjs/common';
import { MatchGateway } from './match.gateway';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  providers: [MatchGateway],
  exports: [MatchGateway],
})
export class GatewayModule {}
