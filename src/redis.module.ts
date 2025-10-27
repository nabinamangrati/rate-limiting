import { Global, Module } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

export const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.connect();

@Global()
@Module({
  providers: [{ provide: 'REDIS_CLIENT', useValue: redisClient }],
  exports: ['REDIS_CLIENT'], 
})
export class RedisModule {}
