import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

let redis: Redis | null = null;

export function getRedis() {
  if (!redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.warn("Upstash Redis credentials missing. Using in-memory fallback.");
      return null;
    }
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export const fallbackCalls: any[] = [];
