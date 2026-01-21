import { Injectable } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class ChatRoomService {
  private readonly redis: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getOrThrow();
  }

  async addUserToRoom(matchId: string, userId: string) {
    await this.redis.sadd(`match:${matchId}:users`, userId);
  }

  async removeUserFromRoom(matchId: string, userId: string) {
    await this.redis.srem(`match:${matchId}:users`, userId);
  }

  async getActiveUserCount(matchId: string): Promise<number> {
    return this.redis.scard(`match:${matchId}:users`);
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
    const keys = await this.redis.keys(`match:${matchId}:typing:*`);
    return keys.map((key: string) => key.split(':').pop() || '');
  }
}
