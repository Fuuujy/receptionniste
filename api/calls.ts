import { getRedis, fallbackCalls } from './_lib/redis.js';

export default async function handler(req: any, res: any) {
  // Allow GET and DELETE requests
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing call ID' });
    }

    try {
      const r = getRedis();
      if (r) {
        try {
          const calls = await r.zrange('calls', 0, -1);
          // Upstash redis might return parsed objects or strings. Handle both.
          const callToDelete = calls.find((c: any) => {
            const parsed = typeof c === 'string' ? JSON.parse(c) : c;
            return parsed.id === id;
          });
          
          if (callToDelete) {
            // zrem expects the exact member. If it was returned as an object, stringify it.
            const memberToRemove = typeof callToDelete === 'string' ? callToDelete : JSON.stringify(callToDelete);
            await r.zrem('calls', memberToRemove);
            return res.status(200).json({ success: true });
          } else {
            return res.status(404).json({ error: 'Call not found' });
          }
        } catch (redisError: any) {
          console.error("Redis error deleting call:", redisError.message);
          const index = fallbackCalls.findIndex(c => c.id === id);
          if (index !== -1) fallbackCalls.splice(index, 1);
          return res.status(200).json({ success: true });
        }
      } else {
        const index = fallbackCalls.findIndex(c => c.id === id);
        if (index !== -1) fallbackCalls.splice(index, 1);
        return res.status(200).json({ success: true });
      }
    } catch (error) {
      console.error("Error deleting call:", error);
      return res.status(500).json({ error: "Failed to delete call" });
    }
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
