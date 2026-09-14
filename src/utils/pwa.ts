// PWA Service Worker registration with forced update detection.
// On every load we check for a new SW version; when one is found (installed and
// waiting) we show an "update available" banner and reload on apply, so devices
// never stay stuck on a stale bundle (the classic "it works on CI but my phone
// still shows the old version" trap). Ported from the Inventory-System PWA.

import { APP_VERSION } from '../version';

function showUpdateBanner(onApply: () => void): void {
  const existing = document.getElementById('pwa-update-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.setAttribute('role', 'status');
  banner.style.cssText = [
    'position:fixed',
    'bottom:20px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:100000',
    'background:linear-gradient(135deg, #0ea5e9, #6366f1)',
    'color:#fff',
    'padding:12px 18px',
    'border-radius:12px',
    'display:flex',
    'align-items:center',
    'gap:12px',
    'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
    'font:inherit',
    'font-size:13px',
    'animation:pwaSlideUp 0.4s ease-out',
  ].join(';');

  const label = document.createElement('span');
  label.textContent = `🚀 ${APP_VERSION} — новая версия. Нажмите, чтобы обновить.`;
  banner.appendChild(label);

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Update Now';
  applyBtn.style.cssText =
    'background:#fff;color:#0f172a;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:13px;white-space:nowrap;';
  applyBtn.addEventListener('click', () => {
    banner.remove();
    onApply();
  });
  banner.appendChild(applyBtn);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.style.cssText = 'background:transparent;color:rgba(255,255,255,0.7);border:none;font-size:16px;cursor:pointer;padding:2px 6px;';
  closeBtn.addEventListener('click', () => banner.remove());
  banner.appendChild(closeBtn);

  document.body.appendChild(banner);

  if (!document.getElementById('pwa-update-style')) {
    const style = document.createElement('style');
    style.id = 'pwa-update-style';
    style.textContent =
      '@keyframes pwaSlideUp{from{opacity:0;transform:translateX(-50%) translateY(30px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}';
    document.head.appendChild(style);
  }
}

function hardReload(): void {
  window.location.href = `${window.location.pathname}?t=${Date.now()}`;
}

function applyPwaUpdate(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) =>
        Promise.all(regs.map((r) => r.unregister())).then(() => {
          if ('caches' in window) {
            caches
              .keys()
              .then((names) => Promise.all(names.map((n) => caches.delete(n))))
              .then(hardReload);
          } else {
            hardReload();
          }
        })
      )
      .catch(hardReload);
  } else {
    hardReload();
  }
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    // updateViaCache:'none' forces the browser to bypass HTTP cache when
    // fetching sw.js — every load sees the newest service worker bytes.
    const swUrl = `/sw.js?v=${APP_VERSION}`;
    navigator.serviceWorker
      .register(swUrl, { updateViaCache: 'none' })
      .then((reg) => {
        // A waiting worker means an update was already downloaded (previous
        // load detected it) — surface the banner immediately.
        if (reg.waiting) showUpdateBanner(() => applyPwaUpdate());

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            // New SW installed and there is a controlling SW — show the banner;
            // user taps Update Now, we unregister + purge caches + hard reload.
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner(() => applyPwaUpdate());
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}