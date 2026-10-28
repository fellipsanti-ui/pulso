/* ===== Pulso: service worker (faz o app abrir rápido e funcionar sem internet) =====
   Quando mudar qualquer arquivo do site, aumente o número da VERSAO (v1 -> v2).
   Isso faz os aparelhos baixarem a versão nova e apagarem a antiga. */
   const VERSAO = 'pulso-v3';
   const BASE = ['./', 'pag1.html', 'pag2.html', 'pag3.html', 'pag4.html', 'pag5.html', 'pag6.html',
     'css/estilo.css', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
     'img/login-corrida.svg', 'img/painel-banner.svg', 'img/recuperacao-alongamento.svg'];   

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(chaves => Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Arquivos do site e fontes do Google: responde na hora com o que está guardado e atualiza em segundo plano.
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  const doSite = url.origin === self.location.origin;
  const fonte = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (req.method !== 'GET' || !(doSite || fonte)) return;
  e.respondWith(caches.open(VERSAO).then(async cache => {
    const guardado = await cache.match(req, { ignoreSearch: true });
    const rede = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return guardado || (await rede) || (req.mode === 'navigate' ? cache.match('pag1.html') : Response.error());
  }));
});
