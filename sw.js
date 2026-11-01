// service worker: เปิดหน้าเว็บได้แม้สัญญาณหาย (หน้ากรอกคะแนนเก็บคิวในเครื่อง แล้วส่งเมื่อกลับมาออนไลน์)
// "เน็ตก่อน แล้วค่อยของในเครื่อง" → แก้ไฟล์บน GitHub แล้วผู้ใช้เห็นของใหม่เอง
const CACHE = 'gp-strokeplay-shell';
const SHELL = ['./', 'index.html', 'event.html', 'config.js', 'gas-shim.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const cdn = /cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (url.origin !== location.origin && !cdn) return;   // Apps Script ไม่ยุ่ง
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: url.origin === location.origin })));
});
