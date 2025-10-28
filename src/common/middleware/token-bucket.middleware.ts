import { FastifyRequest, FastifyReply } from 'fastify';
import { RedisClientType } from 'redis';

const tokenBucketLuaScript = `
local key = KEYS[1]
local maxTokens = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local refillInterval = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

local bucket = redis.call('HGETALL', key)
local tokens = nil
local lastRefill = nil
if next(bucket) == nil then
  tokens = maxTokens
  lastRefill = now
else
  for i = 1, #bucket, 2 do
    if bucket[i] == 'tokens' then tokens = tonumber(bucket[i+1]) end
    if bucket[i] == 'lastRefill' then lastRefill = tonumber(bucket[i+1]) end
  end
  tokens = tokens or maxTokens
  lastRefill = lastRefill or now
end

local elapsed = math.floor((now - lastRefill) / 1000)
if elapsed >= refillInterval then
  local refillCount = math.floor(elapsed / refillInterval) * refillRate
  tokens = math.min(tokens + refillCount, maxTokens)
  lastRefill = now
end

if tokens <= 0 then
  local retryAfter = refillInterval
  return {0, tokens, retryAfter}
end

tokens = tokens - 1
redis.call('HSET', key, 'tokens', tostring(tokens), 'lastRefill', tostring(lastRefill))
redis.call('EXPIRE', key, ttl)
return {1, tokens, 0}
`;


export const TokenBucketMiddleware = (redisClient: RedisClientType) => {
  const maxTokens = 2;
  const refillRate = 1;
  const refillInterval = 10; // 10 sec for testig
  const bucketTTL = 40; // 40 sec for testing

  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.url.startsWith('/api/rate-limiting')) {
      return; // skip swagger
    }

    const userEmail = (req as any).user?.email || req.ip;
    const safeEmail = userEmail.replace(/[^a-zA-Z0-9]/g, ':');
    const key = `ratelimit:user:${safeEmail}`;
    const now = Date.now();

    const res: any = await redisClient.eval(tokenBucketLuaScript, {
      keys: [key],
      arguments: [
        maxTokens.toString(),
        refillRate.toString(),
        refillInterval.toString(),
        now.toString(),
        bucketTTL.toString(),
      ],
    });

    const allowed = Number(res[0]) === 1;
    const remaining = Number(res[1]);
    const retryAfter = Number(res[2]);
    (req as any).rateLimit = { allowed, remaining, retryAfter };

    reply
      .header('X-RateLimit-Limit', maxTokens.toString())
      .header('X-RateLimit-Remaining', remaining.toString());

   if (!allowed) {
  reply
    .header('Retry-After', retryAfter.toString())
    .status(429)
    .send({
      message: 'Rate limit exceeded',
      allowed,
      remaining,
      retryAfter,
    });
  return;
}
  };
};
