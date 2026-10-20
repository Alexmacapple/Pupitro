// Only the build allowlist enters this cache. Scores live in IndexedDB.
let buildPromise;
// scripts/build_web.py binds this worker to one complete, immutable app cache.
const version = "__PUPITRO_BUILD__";
const cacheName = "pupitro-app-" + version;
const build = () => buildPromise ||= fetch(new URL("offline-assets.json", self.registration.scope), {cache: "no-store"}).then(r => {
  if (!r.ok) throw new Error("Offline manifest unavailable");
  return r.json();
});
const cachePrefix = "pupitro-app-";
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const manifest = await build();
    if (manifest.version !== version) throw new Error("Offline manifest version mismatch");
    const cache = await caches.open(cacheName);
    for (const item of manifest.files) {
      const url = new URL(item.path, self.registration.scope);
      const previous = await cache.match(url);
      if (previous) continue;
      const response = await fetch(url, {cache: "no-store"});
      if (!response.ok) throw new Error(`Offline asset unavailable: ${item.path}`);
      const data = await response.arrayBuffer();
      const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].map(x => x.toString(16).padStart(2,"0")).join("");
      if (digest !== item.sha256) throw new Error(`Offline asset changed: ${item.path}`);
      await cache.put(url, new Response(data, {headers: response.headers}));
    }
    // Keep the manifest inside its cache; offline startup never needs the network.
    await cache.put(new URL("offline-assets.json", self.registration.scope), new Response(JSON.stringify(manifest), {headers: {"Content-Type": "application/json"}}));
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const cached = await (await caches.open(cacheName)).match(new URL("offline-assets.json", self.registration.scope));
    if (!cached) throw new Error("Offline manifest missing");
    // Activation waits for old tabs to close unless the user requests updating.
    await Promise.all(names.filter(name => name.startsWith(cachePrefix) && name !== cacheName).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", event => {
  if (event.data === "ACTIVATE_UPDATE") self.skipWaiting();
  if (event.data === "OFFLINE_STATUS") event.waitUntil((async () => {
    const response = await (await caches.open(cacheName)).match(new URL("offline-assets.json", self.registration.scope));
    event.ports[0]?.postMessage(response ? await response.json() : null);
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url), scope = new URL(self.registration.scope);
  if (request.method !== "GET" || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const key = request.mode === "navigate" && (url.pathname === scope.pathname || url.pathname === scope.pathname + "index.html")
      ? new URL("index.html", scope).href : request;
    const response = await cache.match(key);
    if (response) return response;
    return fetch(request);
  })());
});
