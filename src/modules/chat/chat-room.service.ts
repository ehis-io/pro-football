import { Injectable } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class ChatRoomService {
  private readonly redis: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getOrThrow();
  }

  async addUserToRoom(matchId: string, userId: string, socketId: string) {
    // Add socket to the room's active sockets
    await this.redis.sadd(`match:${matchId}:sockets`, socketId);
    // Add user to the room's unique users
    await this.redis.sadd(`match:${matchId}:users`, userId);
  }

  async removeUserFromRoom(matchId: string, userId: string, socketId: string) {
    await this.redis.srem(`match:${matchId}:sockets`, socketId);
    
    // Check if user has any other sockets in this room
    // This is a bit complex for a simple set, but we can just use the socket count as the truth for "active connections"
  }

  async getActiveUserCount(matchId: string): Promise<number> {
    // Return unique users count for a more accurate representation of "people"
    return this.redis.scard(`match:${matchId}:users`);
  }
  
  async getActiveSocketCount(matchId: string): Promise<number> {
    return this.redis.scard(`match:${matchId}:sockets`);
  }

  async setTypingStatus(matchId: string, userId: string, isTyping: boolean) {
    const key = `match:${matchId}:typing:${userId}`;
    if (isTyping) {
      await this.redis.set(key, '1', 'EX', 5); // Auto-clear after 5 seconds
    } else {
      await this.redis.del(key);
    }
  }

  async getTypingUsers(matchId: string): Promise<string[]> {
    const pattern = `match:${matchId}:typing:*`;
    const typingUsers: string[] = [];
    let cursor = '0';

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = newCursor;
      keys.forEach((key) => {
        const userId = key.split(':').pop();
        if (userId) typingUsers.push(userId);
      });
    } while (cursor !== '0');

    return typingUsers;
  }
}
