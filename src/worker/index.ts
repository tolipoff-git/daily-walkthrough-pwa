export interface Env {
  ASSETS: Fetcher;
  EHS_KV?: KVNamespace;
}

// In-memory fallback cache across edge isolate invocations
const memoryStore = new Map<string, string>();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Cross-Origin Resource Sharing (CORS) headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-ID',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders, status: 204 });
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Real-time Sync API: /api/sync/:key
    if (url.pathname.startsWith('/api/sync/')) {
      const key = decodeURIComponent(url.pathname.replace('/api/sync/', '')).trim();

      if (!key) {
        return new Response(JSON.stringify({ error: 'Missing sync key' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(rawData, {
          status: 200,
          headers: {
            ...corsHeaders,
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
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: 'Invalid JSON body', details: err?.message }), 
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    // Default: Static Asset Serving via Cloudflare Assets
    return env.ASSETS.fetch(request);
  },
};
