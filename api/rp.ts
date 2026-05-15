import type { VercelRequest, VercelResponse } from '@vercel/node';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const bucket = new Map<string, { count: number; start: number }>();

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
}

function hitRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = bucket.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    bucket.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const expectedApiKey = process.env.DASHBOARD_API_KEY;
  if (expectedApiKey) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== expectedApiKey) return res.status(401).json({ error: 'Unauthorized' });
  }

  const ip = (req.headers['x-forwarded-for'] as string || 'unknown').split(',')[0].trim();
  if (hitRateLimit(ip)) {
    return res.status(429).json({ error: 'Too Many Requests' });
  }

  const range = String(req.query.range || '30d');
  const days = range === '7d' ? 7 : range === '30d' ? 30 : null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Missing env' });

  const params = new URLSearchParams({ select: 'id,rp,created_at', order: 'created_at.asc' });
  if (days) {
    const from = new Date(Date.now() - days * 86400000).toISOString();
    params.append('created_at', `gte.${from}`);
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/player_rp?${params.toString()}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    return res.status(502).json({ error: `Supabase Error: ${text}` });
  }

  const data = await response.json();
  return res.status(200).json({ data });
}
