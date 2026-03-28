import { getRedis, fallbackCalls } from '../_lib/redis.js';

export default async function handler(req: any, res: any) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const callData = req.body || {};
    
    // Format the data to match our frontend Call interface
    // Handle cases where data might be passed as "=" or other weird strings from n8n
    const safeString = (val: any, fallback: string) => {
      if (!val || val === '=' || typeof val !== 'string') return fallback;
      return val;
    };

    const safeNumber = (val: any, fallback: number) => {
      if (val === undefined || val === null || isNaN(Number(val))) return fallback;
      return Number(val);
    };

    const newCall = {
      id: callData.chat_id || callData.id || `call_${Date.now()}`,
      callerName: safeString(callData.prenom || callData.callerName, 'Inconnu'),
      callerNumber: safeString(callData.numero || callData.callerNumber, 'Inconnu'),
      date: callData.timestamp || callData.date || new Date().toISOString(),
      duration: safeNumber(callData.duration, 0),
      summary: safeString(callData.resume || callData.summary, 'Appel terminé.'),
      probleme: safeString(callData.probleme, '-'),
      heure_rdv: safeString(callData.heure_rdv, null),
      transcript: Array.isArray(callData.transcript) ? callData.transcript : [],
    };

    const r = getRedis();
    if (r) {
      try {
        // Store in Redis Sorted Set, scored by timestamp
        await r.zadd('calls', { score: Date.now(), member: JSON.stringify(newCall) });
      } catch (redisError: any) {
        console.error("Redis error saving call, falling back to memory:", redisError.message);
        fallbackCalls.unshift(newCall);
      }
    } else {
      fallbackCalls.unshift(newCall);
    }

    res.status(200).json({ success: true, message: "Call received and saved" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
