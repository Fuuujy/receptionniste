import { getRedis, fallbackCalls } from './_lib/redis.js';

export default async function handler(req: any, res: any) {
  // Allow only GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const r = getRedis();
    if (r) {
      try {
        // Get all calls from a sorted set, newest first
        const calls = await r.zrange('calls', 0, -1, { rev: true });
        res.status(200).json(calls);
      } catch (redisError: any) {
        console.error("Redis error fetching calls, falling back to memory:", redisError.message);
        res.status(200).json(fallbackCalls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } else {
      res.status(200).json(fallbackCalls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  } catch (error) {
    console.error("Error fetching calls:", error);
    res.status(500).json({ error: "Failed to fetch calls" });
  }
}
