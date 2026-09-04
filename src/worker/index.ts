export interface WorkerFetcher {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export interface WorkerKVNamespace {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
}

export interface Env {
  ASSETS: WorkerFetcher;
  EHS_KV?: WorkerKVNamespace;
}

// In-memory fallback cache across edge isolate invocations
const memoryStore = new Map<string, string>();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Security & Privacy Headers (Anti-indexing & strict isolation)
    const securityHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-ID',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'no-referrer',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: securityHeaders, status: 204 });
    }

    // Health & Info Endpoint
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          time: new Date().toISOString(), 
          hasKv: Boolean(env.EHS_KV) 
        }), 
        {
          headers: { ...securityHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Weekly Executive Aggregation API: /api/reports/weekly
    if (url.pathname === '/api/reports/weekly') {
      try {
        let sessions: any[] = [];
        const start = url.searchParams.get('start') || '';
        const end = url.searchParams.get('end') || '';
        const room = url.searchParams.get('room') || 'FSE-MAIN';

        if (request.method === 'POST') {
          const body = (await request.json()) as any;
          sessions = Array.isArray(body?.sessions) ? body.sessions : [];
        } else if (request.method === 'GET') {
          // Attempt to pull latest session snapshot from KV room
          let rawData: string | null = null;
          if (env.EHS_KV) {
            try {
              rawData = await env.EHS_KV.get(`room:${room}`);
            } catch (e) {
              console.error('KV read error:', e);
            }
          }
          if (!rawData) {
            rawData = memoryStore.get(`room:${room}`) || null;
          }
          if (rawData) {
            try {
              const parsed = JSON.parse(rawData);
              sessions = Array.isArray(parsed) ? parsed : [parsed];
            } catch {}
          }
        }

        // Calculate aggregated metrics
        const totalDays = sessions.length;
        let totalScore = 0;
        let totalDefects = 0;
        const defectsByArea: Record<string, number> = {};
        const defectsByCategory: Record<string, number> = {};
        const criticalRegulatoryRisks: string[] = [];

        for (const s of sessions) {
          let pass = 0;
          let fail = 0;
          for (const item of s.items || []) {
            if (item.status === 'PASS') pass++;
            else if (item.status === 'FAIL') {
              fail++;
              totalDefects++;
              const loc = item.defectDetails?.zonePreset || item.defectDetails?.location || 'Floor';
              defectsByArea[loc] = (defectsByArea[loc] || 0) + 1;
              const cat = item.categoryId || 'cat2';
              defectsByCategory[cat] = (defectsByCategory[cat] || 0) + 1;

              if (cat === 'cat1' || item.defectDetails?.priority === 'P1') {
                criticalRegulatoryRisks.push(`[${s.date}] ${item.titleEn || item.id}: ${item.defectDetails?.description || ''}`);
              }
            }
          }
          const dayScore = pass + fail > 0 ? Math.round((pass / (pass + fail)) * 100) : 100;
          totalScore += dayScore;
        }

        const avgScore = totalDays > 0 ? Math.round(totalScore / totalDays) : 100;

        return new Response(
          JSON.stringify({
            period: { start, end },
            auditedDaysCount: totalDays,
            averageComplianceScore: avgScore,
            ragStatus: avgScore >= 85 ? 'GREEN' : avgScore >= 70 ? 'AMBER' : 'RED',
            totalDefects,
            defectsByArea,
            defectsByCategory,
            criticalRegulatoryRisks,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { ...securityHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Failed to aggregate weekly report', details: err?.message }), {
          status: 400,
          headers: { ...securityHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Real-time Sync API: /api/sync/:key
    if (url.pathname.startsWith('/api/sync/')) {
      const key = decodeURIComponent(url.pathname.replace('/api/sync/', '')).trim();

      if (!key) {
        return new Response(JSON.stringify({ error: 'Missing sync key' }), {
          status: 400,
          headers: { ...securityHeaders, 'Content-Type': 'application/json' },
        });
      }

      // GET /api/sync/:key
      if (request.method === 'GET') {
        let rawData: string | null = null;

        if (env.EHS_KV) {
          try {
            rawData = await env.EHS_KV.get(key);
          } catch (e) {
            console.error('KV read error:', e);
          }
        }

        if (!rawData) {
          rawData = memoryStore.get(key) || null;
        }

        if (!rawData) {
          return new Response(JSON.stringify({ notFound: true, key }), {
            status: 404,
            headers: { ...securityHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(rawData, {
          status: 200,
          headers: {
            ...securityHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }

      // POST /api/sync/:key
      if (request.method === 'POST') {
        try {
          const bodyText = await request.text();

          // Validate JSON payload
          JSON.parse(bodyText);

          if (env.EHS_KV) {
            try {
              // 7 days expiration TTL
              await env.EHS_KV.put(key, bodyText, { expirationTtl: 604800 });
            } catch (e) {
              console.error('KV write error:', e);
            }
          }

          // Always update in-memory fallback
          memoryStore.set(key, bodyText);

          return new Response(
            JSON.stringify({ 
              success: true, 
              key, 
              timestamp: new Date().toISOString() 
            }), 
            {
              status: 200,
              headers: { ...securityHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: 'Invalid JSON body', details: err?.message }), 
            {
              status: 400,
              headers: { ...securityHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    // Default: Static Asset Serving via Cloudflare Assets with Security & Anti-Indexing Headers
    const assetResponse = await env.ASSETS.fetch(request);
    const assetHeaders = new Headers(assetResponse.headers);
    assetHeaders.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
    assetHeaders.set('X-Content-Type-Options', 'nosniff');
    assetHeaders.set('X-Frame-Options', 'SAMEORIGIN');

    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers: assetHeaders,
    });
  },
};
