import { FastifyRequest, FastifyReply } from 'fastify';
import { RedisClientType } from 'redis';

export const TokenBucketMiddleware = (redisClient: RedisClientType) => {
  const maxTokens = 2;
  const refillRate = 1;
  const refillInterval = 10;

  return async (req: FastifyRequest, reply: FastifyReply) => {
      if (req.url.startsWith('/api/rate-limiting')) {
      return; // Let Swagger requests through
    }

    const userEmail = (req as any).user?.email || req.ip; 
    const safeEmail = userEmail.replace(/[@.]/g, ':');
    const key = `ratelimit:user:${safeEmail}`;

    const bucket = await redisClient.hGetAll(key);
    let tokens = bucket.tokens ? parseInt(bucket.tokens) : maxTokens;
    let lastRefill = bucket.lastRefill ? parseInt(bucket.lastRefill) : Date.now();

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastRefill) / 1000);

    if (elapsedSeconds >= refillInterval) {
      const refillCount = Math.floor(elapsedSeconds / refillInterval) * refillRate;
      tokens = Math.min(tokens + refillCount, maxTokens);
      lastRefill = now;
    }

    if (tokens <= 0) {
      const retryAfter = refillInterval;
      reply
        .header('Retry-After', retryAfter.toString())
        .header('X-RateLimit-Limit', maxTokens.toString())
        .header('X-RateLimit-Remaining', '0')
        .status(429)
        .send({ message: 'Rate limit exceeded' });
      return;
    }

    tokens -= 1;

    await redisClient.hSet(key, {
      tokens: tokens.toString(),
      lastRefill: lastRefill.toString(),
    });

    reply
      .header('X-RateLimit-Limit', maxTokens.toString())
      .header('X-RateLimit-Remaining', tokens.toString());
      const bucketTTL = 40;
      await redisClient.expire(key, bucketTTL);
  };
};
