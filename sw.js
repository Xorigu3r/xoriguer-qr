// Xoriguer QR · funcionament sense connexió
// Quan canviïs l'app, puja el número de versió perquè els mòbils agafin la nova.
const VERSION = "xoriguerqr-v5";
const APP = [
  "./", "index.html", "manifest.json", "css/app.css", "marca/marca.css", "marca/Montserrat-ExtraBold.ttf",
  "js/idioma.js", "js/fitxes.js", "js/dibuix.js", "js/cripto.js", "js/app.js", "vendor/qrcode.js", "vendor/jsQR.js",
  "icons/simbol.png", "icons/falco.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png",
  "icons/apple-touch-icon.png", "icons/favicon-64.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    // només les versions velles d'AQUESTA app (el domini el comparteixen altres apps Xoriguer)
    .then(keys => Promise.all(keys.filter(k => k.startsWith("xoriguerqr-") && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate" || /\.(html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith("/")) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return res;
  })));
});
