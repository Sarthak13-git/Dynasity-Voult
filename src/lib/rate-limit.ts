import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimiter: Ratelimit | null = null;
let redisClient: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    ratelimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(10, "60 s"), // Default fallback
      analytics: false,
    });
  } catch (err) {
    console.error("Failed to initialize Upstash Redis rate limiter:", err);
  }
} else {
  if (process.env.NODE_ENV === "development") {
    console.warn("⚠️ UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set. Rate limiting is bypassed.");
  }
}

interface RateLimitResponse {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  key: string,
  limit?: number,
  durationStr: string = "60 s"
): Promise<RateLimitResponse> {
  if (!ratelimiter || !redisClient) {
    return { success: true, limit: 100, remaining: 100, reset: Date.now() };
  }

  try {
    let activeLimiter = ratelimiter;
    if (limit) {
      activeLimiter = new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(limit, durationStr as any),
        analytics: false,
      });
    }

    const result = await activeLimiter.limit(key);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    console.error("Rate limit check failed (failing open):", err);
    return { success: true, limit: 100, remaining: 100, reset: Date.now() };
  }
}
