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

    // Cloudflare Worker Photo Viewing Endpoint: /photo/:room/:photoId and /api/photo/:room/:photoId
    const photoMatch = url.pathname.match(/^\/(?:api\/)?photo\/([^/]+)\/([^/]+)\/?$/);
    if (photoMatch) {
      const rawRoom = photoMatch[1];
      const rawPhotoId = photoMatch[2];
      const room = decodeURIComponent(rawRoom).trim();
      const photoId = decodeURIComponent(rawPhotoId).trim();

      if (!room || !photoId) {
        return new Response(JSON.stringify({ error: 'Missing room or photoId' }), {
          status: 400,
          headers: { ...securityHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isRaw = url.searchParams.has('raw') || url.searchParams.get('raw') === '1';
      const isDownload = url.searchParams.has('download') || url.searchParams.get('download') === '1';
      const acceptHeader = request.headers.get('Accept') || '';
      const acceptsHtml = acceptHeader.includes('text/html');
      const wantsHtml = acceptsHtml && !isRaw && !isDownload;

      // KV key lookups (clean uppercase or original)
      const cleanRoom = room.toUpperCase();
      const primaryKey = `photo_${cleanRoom}_${photoId}`;
      const fallbackKey = `photo_${room}_${photoId}`;

      let rawData: string | null = null;
      if (env.EHS_KV) {
        try {
          rawData = await env.EHS_KV.get(primaryKey);
          if (!rawData && primaryKey !== fallbackKey) {
            rawData = await env.EHS_KV.get(fallbackKey);
          }
        } catch (e) {
          console.error('KV photo read error:', e);
        }
      }

      if (!rawData) {
        rawData = memoryStore.get(primaryKey) || memoryStore.get(fallbackKey) || null;
      }

      if (!rawData) {
        if (wantsHtml) {
          return new Response(renderNotFoundHtml(room, photoId), {
            status: 404,
            headers: { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        return new Response(
          JSON.stringify({
            error: 'Photo not found',
            room,
            photoId,
            message: 'The photo has not yet synced to the cloud from the inspector device or has expired after 7 days.',
          }),
          {
            status: 404,
            headers: { ...securityHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      let payload: { id?: string; url?: string; caption?: string; timestamp?: string } = {};
      try {
        payload = JSON.parse(rawData);
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: 'Corrupt photo data', details: err?.message }),
          { status: 500, headers: { ...securityHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const photoUrl = payload.url || '';
      const caption = payload.caption || '';
      const timestamp = payload.timestamp || '';

      // Return binary image directly if requested raw, download, or non-HTML request
      if (isRaw || isDownload || !acceptsHtml) {
        if (photoUrl.startsWith('data:')) {
          const match = photoUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (!match) {
            return new Response('Invalid data URL image encoding', { status: 400, headers: securityHeaders });
          }
          const mimeType = match[1];
          const base64Str = match[2];
          const bytes = base64ToUint8Array(base64Str);
          const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
          const disposition = isDownload ? 'attachment' : 'inline';

          return new Response(bytes, {
            status: 200,
            headers: {
              ...securityHeaders,
              'Content-Type': mimeType,
              'Content-Disposition': `${disposition}; filename="${photoId}.${ext}"`,
              'Cache-Control': 'public, max-age=604800, immutable',
            },
          });
        } else if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
          return Response.redirect(photoUrl, 302);
        } else {
          return new Response('Image data empty or invalid', { status: 404, headers: securityHeaders });
        }
      }

      // Default browser request: return standalone responsive dark-mode HTML viewer
      return new Response(renderViewerHtml(room, photoId, caption, timestamp), {
        status: 200,
        headers: {
          ...securityHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function renderNotFoundHtml(room: string, photoId: string): string {
  const safeRoom = escapeHtml(room);
  const safeId = escapeHtml(photoId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Photo Not Available | EHS Walkthrough</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 36px 28px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 16px; }
    code {
      background: #0f172a;
      border: 1px solid #334155;
      padding: 2px 8px;
      border-radius: 6px;
      color: #38bdf8;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .actions { display: flex; gap: 10px; justify-content: center; margin-top: 24px; flex-wrap: wrap; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-primary { background: #2563eb; color: #ffffff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #334155; color: #e2e8f0; border-color: #475569; }
    .btn-secondary:hover { background: #475569; color: #ffffff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📷</div>
    <h1>Photo Not Yet Synced / Фото недоступно</h1>
    <p>
      Photo <code>${safeId}</code> in room <code>${safeRoom}</code> was not found in cloud storage.
    </p>
    <div class="badge">Awaiting Sync or Expired (7-day TTL)</div>
    <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
      If the audit is currently in progress, please ensure the auditor device is connected to Wi-Fi/cellular and triggers Export/Print to push evidence to cloud.
    </p>
    <div class="actions">
      <a href="javascript:location.reload()" class="btn btn-primary">🔄 Check Again</a>
      <a href="/" class="btn btn-secondary">← Back to PWA</a>
    </div>
  </div>
</body>
</html>`;
}

function renderViewerHtml(room: string, photoId: string, caption: string, timestamp: string): string {
  const safeRoom = escapeHtml(room);
  const safeId = escapeHtml(photoId);
  const safeCaption = escapeHtml(caption || 'Inspection Defect Photo');
  const safeTitle = escapeHtml(caption ? `${caption} (${photoId})` : `Defect Photo ${photoId}`);
  const displayTime = timestamp ? new Date(timestamp).toLocaleString() : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <title>${safeTitle} | EHS Walkthrough 4K Evidence</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #090d16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
      user-select: none;
      -webkit-user-select: none;
    }
    header {
      height: 56px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(51, 65, 85, 0.7);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 50;
      flex-shrink: 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .header-center {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      min-width: 0;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, monospace;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .title-text {
      font-weight: 600;
      font-size: 13px;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 320px;
    }
    .time-text {
      color: #94a3b8;
      font-size: 11px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid rgba(71, 85, 105, 0.6);
      background: #1e293b;
      color: #e2e8f0;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn:hover {
      background: #334155;
      color: #ffffff;
      border-color: #64748b;
    }
    .btn-primary {
      background: #2563eb;
      border-color: #3b82f6;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-icon {
      padding: 6px 10px;
      font-family: monospace;
      font-weight: bold;
    }
    #viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, #131b2e 0%, #060911 100%);
      cursor: grab;
    }
    #viewport.dragging {
      cursor: grabbing;
    }
    #image-container {
      position: absolute;
      transform-origin: 0 0;
      will-change: transform;
      user-select: none;
    }
    #photo {
      display: block;
      max-width: none;
      pointer-events: none;
      border-radius: 4px;
      box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.8);
    }
    #hud {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(71, 85, 105, 0.5);
      backdrop-filter: blur(8px);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 40;
    }
    #hud.visible {
      opacity: 1;
    }
    .info-footer {
      position: absolute;
      bottom: 12px;
      left: 16px;
      font-size: 11px;
      color: #64748b;
      pointer-events: none;
      z-index: 30;
      line-height: 1.4;
      background: rgba(15, 23, 42, 0.7);
      padding: 6px 10px;
      border-radius: 6px;
      backdrop-filter: blur(4px);
    }
    @media (max-width: 768px) {
      .header-center { display: none; }
      .title-text { max-width: 140px; }
      .btn-text { display: none; }
      .info-footer { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <a href="/" class="btn" title="Back to PWA">← <span class="btn-text">Back to PWA</span></a>
      <div class="badge">${safeRoom}</div>
      <div class="title-text" title="${safeCaption}">${safeCaption}</div>
    </div>
    <div class="header-center">
      <span class="time-text">${escapeHtml(displayTime)}</span>
    </div>
    <div class="header-right">
      <button id="btn-zoom-out" class="btn btn-icon" title="Zoom Out (-)">−</button>
      <button id="btn-zoom-reset" class="btn" title="Reset Zoom / Fit">Fit</button>
      <button id="btn-zoom-in" class="btn btn-icon" title="Zoom In (+)">+</button>
      <a href="?download=1" class="btn btn-primary" title="Download Original High-Res Image">⬇ <span class="btn-text">Download Original</span></a>
      <a href="?raw=1" target="_blank" class="btn" title="Open Raw Binary Image">↗ <span class="btn-text">Raw</span></a>
    </div>
  </header>

  <main id="viewport">
    <div id="image-container">
      <img id="photo" src="?raw=1" alt="${safeCaption}" />
    </div>
    <div id="hud">100%</div>
    <div class="info-footer">
      <div>Room: <strong>${safeRoom}</strong> | Photo ID: <strong>${safeId}</strong></div>
      <div>Scroll to Zoom • Drag to Pan • Double-Click to Toggle 100%</div>
    </div>
  </main>

  <script>
    (function() {
      const viewport = document.getElementById('viewport');
      const container = document.getElementById('image-container');
      const photo = document.getElementById('photo');
      const hud = document.getElementById('hud');
      const btnIn = document.getElementById('btn-zoom-in');
      const btnOut = document.getElementById('btn-zoom-out');
      const btnReset = document.getElementById('btn-zoom-reset');

      let scale = 1;
      let panX = 0;
      let panY = 0;
      let isDragging = false;
      let startMouseX = 0;
      let startMouseY = 0;
      let startPanX = 0;
      let startPanY = 0;
      let fitScale = 1;
      let hudTimer = null;

      function showHud(text) {
        hud.textContent = text;
        hud.classList.add('visible');
        clearTimeout(hudTimer);
        hudTimer = setTimeout(() => hud.classList.remove('visible'), 1200);
      }

      function updateTransform() {
        container.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
      }

      function fitToScreen() {
        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;
        const nw = photo.naturalWidth || 800;
        const nh = photo.naturalHeight || 600;

        fitScale = Math.min(vw / nw * 0.92, vh / nh * 0.92, 1);
        scale = fitScale;
        panX = (vw - nw * scale) / 2;
        panY = (vh - nh * scale) / 2;
        btnReset.textContent = 'Fit';
        updateTransform();
        showHud('Fit (' + Math.round(scale * 100) + '%)');
      }

      function setZoom(newScale, centerX, centerY) {
        const clampedScale = Math.min(Math.max(newScale, 0.15), 6.0);
        if (centerX === undefined) centerX = viewport.clientWidth / 2;
        if (centerY === undefined) centerY = viewport.clientHeight / 2;

        const ratio = clampedScale / scale;
        panX = centerX - (centerX - panX) * ratio;
        panY = centerY - (centerY - panY) * ratio;
        scale = clampedScale;

        btnReset.textContent = Math.abs(scale - 1) < 0.05 ? 'Fit' : '100%';
        updateTransform();
        showHud(Math.round(scale * 100) + '%');
      }

      photo.onload = () => fitToScreen();
      if (photo.complete) fitToScreen();
      window.addEventListener('resize', () => fitToScreen());

      // Wheel zoom
      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.2 : 0.83;
        setZoom(scale * factor, e.clientX, e.clientY - 56);
      }, { passive: false });

      // Click / double click to toggle 100% or fit
      let clickCount = 0;
      let clickTimer = null;
      viewport.addEventListener('click', (e) => {
        if (isDragging) return;
        clickCount++;
        if (clickCount === 1) {
          clickTimer = setTimeout(() => { clickCount = 0; }, 300);
        } else if (clickCount === 2) {
          clearTimeout(clickTimer);
          clickCount = 0;
          if (Math.abs(scale - fitScale) < 0.05) {
            setZoom(1.0, e.clientX, e.clientY - 56);
          } else {
            fitToScreen();
          }
        }
      });

      // Drag to pan
      viewport.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = false;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startPanX = panX;
        startPanY = panY;

        function onMouseMove(ev) {
          const dx = ev.clientX - startMouseX;
          const dy = ev.clientY - startMouseY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            isDragging = true;
            viewport.classList.add('dragging');
          }
          panX = startPanX + dx;
          panY = startPanY + dy;
          updateTransform();
        }

        function onMouseUp() {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          setTimeout(() => {
            isDragging = false;
            viewport.classList.remove('dragging');
          }, 50);
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      // Touch handling (pinch zoom + single-finger pan)
      let initialPinchDist = 0;
      let initialScale = 1;
      viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          startMouseX = e.touches[0].clientX;
          startMouseY = e.touches[0].clientY;
          startPanX = panX;
          startPanY = panY;
        } else if (e.touches.length === 2) {
          initialPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          initialScale = scale;
        }
      }, { passive: true });

      viewport.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          panX = startPanX + (e.touches[0].clientX - startMouseX);
          panY = startPanY + (e.touches[0].clientY - startMouseY);
          updateTransform();
        } else if (e.touches.length === 2 && initialPinchDist > 0) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - 56;
          setZoom(initialScale * (dist / initialPinchDist), midX, midY);
        }
      }, { passive: true });

      // Button handlers
      btnIn.onclick = () => setZoom(scale * 1.25);
      btnOut.onclick = () => setZoom(scale * 0.8);
      btnReset.onclick = () => {
        if (Math.abs(scale - fitScale) < 0.05) {
          setZoom(1.0);
        } else {
          fitToScreen();
        }
      };

      // Keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.key === '+' || e.key === '=') setZoom(scale * 1.25);
        if (e.key === '-' || e.key === '_') setZoom(scale * 0.8);
        if (e.key === '0' || e.key === 'Escape') fitToScreen();
        if (e.key === '1') setZoom(1.0);
      });
    })();
  </script>
</body>
</html>`;
}
