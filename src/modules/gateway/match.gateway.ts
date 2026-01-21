import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { Match } from '../../entities/match.entity';
import { MatchEvent } from '../../entities/match-event.entity';

import { ChatRoomService } from '../chat/chat-room.service';

interface AuthenticatedSocket extends Socket {
  matchId?: string;
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MatchGateway.name);

  constructor(private readonly chatRoomService: ChatRoomService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Cleanup if they were in a match
    const matchId = client.matchId;
    const userId = client.userId;

    if (matchId && userId) {
      await this.chatRoomService.removeUserFromRoom(matchId, userId);
      const count = await this.chatRoomService.getActiveUserCount(matchId);
      this.server
        .to(`match:${matchId}`)
        .emit('userCountUpdate', { matchId, count });
    }
  }

  @SubscribeMessage('joinMatch')
  async handleJoinMatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ) {
    try {
      this.logger.log(`joinMatch event received from ${client.id}`);
      this.logger.log(`Raw data: ${JSON.stringify(data)}`);

      let payload = data;
      if (typeof data === 'string') {
        try {
          payload = JSON.parse(data);
          this.logger.log(`Parsed string data: ${JSON.stringify(payload)}`);
        } catch (e) {
          this.logger.warn(`Failed to parse string data: ${data}`);
        }
      }

      if (!payload || !payload.matchId || !payload.userId) {
        this.logger.warn(`Invalid joinMatch payload from client ${client.id}: ${JSON.stringify(payload)}`);
        client.emit('error', { 
          message: 'matchId and userId are required', 
          received: payload 
        });
        return;
      }

      const { matchId, userId } = payload;

      await client.join(`match:${matchId}`);
      this.logger.log(`Client ${client.id} joined room: match:${matchId}`);

      // Store user info on the socket for cleanup on disconnect
      client.matchId = matchId;
      client.userId = userId;

      await this.chatRoomService.addUserToRoom(matchId, userId);

      const count = await this.chatRoomService.getActiveUserCount(matchId);

      this.logger.log(`User ${userId} joined room ${matchId}. Total active: ${count}`);

      this.server.to(`match:${matchId}`).emit('userCountUpdate', {
        matchId,
        count,
      });

      this.server.to(`match:${matchId}`).emit('userJoined', { userId });
      
      client.emit('joined', { matchId, userId, count });
    } catch (error) {
      this.logger.error(`Error in handleJoinMatch: ${error.message}`, error.stack);
      client.emit('error', { message: 'Failed to join match', details: error.message });
    }
  }

  @SubscribeMessage('leaveMatch')
  async handleLeaveMatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; userId: string },
  ) {
    try {
      if (!data || !data.matchId || !data.userId) {
        this.logger.warn(`Invalid leaveMatch data from client ${client.id}`);
        return;
      }

      const { matchId, userId } = data;
      await client.leave(`match:${matchId}`);

      await this.chatRoomService.removeUserFromRoom(matchId, userId);

      const count = await this.chatRoomService.getActiveUserCount(matchId);

      this.server.to(`match:${matchId}`).emit('userCountUpdate', {
        matchId,
        count,
      });

      this.server.to(`match:${matchId}`).emit('userLeft', { userId });
    } catch (error) {
      this.logger.error(`Error in handleLeaveMatch: ${error.message}`);
    }
  }

  @OnEvent('match.update')
  handleMatchUpdate(payload: Match) {
    this.server.to(`match:${payload.id}`).emit('matchUpdated', payload);
  }

  @OnEvent('match.event')
  handleNewMatchEvent(payload: MatchEvent) {
    this.server.to(`match:${payload.match?.id}`).emit('newEvent', payload);
  }

  @SubscribeMessage('sendMessage')
  handleChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { message: string },
  ) {
    try {
      const matchId = client.matchId;
      const userId = client.userId;

      if (!matchId || !userId) {
        this.logger.warn(
          `User ${client.id} tried to send message without joining a match`,
        );
        client.emit('error', { message: 'You must join a match first' });
        return;
      }

      if (!data || !data.message) {
        this.logger.warn(`Empty message or invalid data from user ${userId}`);
        return;
      }

      if (data.message.length > 280) {
        this.logger.warn(`Message too long from user ${userId}`);
        client.emit('error', { message: 'Message too long (max 280 chars)' });
        return;
      }

      this.logger.log(`Message from user ${userId} in match ${matchId}`);

      this.server.to(`match:${matchId}`).emit('chatMessage', {
        userId: userId,
        message: data.message,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error in handleChatMessage: ${error.message}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { isTyping: boolean },
  ) {
    try {
      const matchId = client.matchId;
      const userId = client.userId;

      if (!matchId || !userId) {
        client.emit('error', { message: 'You must join a match first' });
        return;
      }

      if (!data || typeof data.isTyping === 'undefined') {
        return;
      }

      await this.chatRoomService.setTypingStatus(matchId, userId, data.isTyping);

      const typingUsers = await this.chatRoomService.getTypingUsers(matchId);

      client.to(`match:${matchId}`).emit('typingUpdate', {
        matchId: matchId,
        users: typingUsers,
      });
    } catch (error) {
      this.logger.error(`Error in handleTyping: ${error.message}`);
    }
  }
}
