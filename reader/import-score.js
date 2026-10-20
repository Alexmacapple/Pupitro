// Validate ZIP expansion before handing any untrusted archive to WebAssembly.
export function validateArchive(buffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 22 || view.getUint32(0, true) !== 0x04034b50) throw new Error("Choisis un fichier MuseScore .mscz valide.");
  let end = -1;
  for (let pos = buffer.byteLength - 22; pos >= Math.max(0, buffer.byteLength - 65557); pos--) {
    if (view.getUint32(pos, true) === 0x06054b50 && pos + 22 + view.getUint16(pos + 20, true) === buffer.byteLength) { end = pos; break; }
  }
  const invalid = () => { throw new Error("Archive MSCZ invalide, chiffrée ou trop volumineuse."); };
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) invalid();
  const count = view.getUint16(end + 10, true), directorySize = view.getUint32(end + 12, true);
  let pos = view.getUint32(end + 16, true), total = 0, hasScore = false;
  if (count === 65535 || pos + directorySize !== end) invalid();
  const directoryEnd = pos + directorySize;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > directoryEnd || view.getUint32(pos, true) !== 0x02014b50) invalid();
    const flags = view.getUint16(pos + 8, true), method = view.getUint16(pos + 10, true);
    const nameSize = view.getUint16(pos + 28, true), extraSize = view.getUint16(pos + 30, true), commentSize = view.getUint16(pos + 32, true);
    const next = pos + 46 + nameSize + extraSize + commentSize;
    if (next > directoryEnd || flags & 1 || ![0, 8].includes(method)) invalid();
    total += view.getUint32(pos + 24, true);
    if (total > 200 * 1024 * 1024 || view.getUint32(pos + 42, true) >= directoryEnd) invalid();
    const name = new TextDecoder().decode(new Uint8Array(buffer, pos + 46, nameSize));
    if (/\.mscx$/i.test(name)) hasScore = true;
    pos = next;
  }
  if (pos !== directoryEnd || !hasScore) invalid();
}

export function normalizeLegacyHarmony(xml) {
  const document = new DOMParser().parseFromString(new TextDecoder().decode(xml), "application/xml");
  if (document.querySelector("parsererror") || document.documentElement.tagName !== "museScore") {
    throw new Error("La conversion interne de cette partition a échoué.");
  }
  // MuseScore 2 did not synthesize Harmony labels. MuseScore 3 enables that
  // feature by default during migration; preserve the old playback semantics.
  for (const harmony of document.getElementsByTagName("Harmony")) {
    let play = [...harmony.children].find(child => child.tagName === "play");
    if (!play) { play = document.createElement("play"); harmony.append(play); }
    play.textContent = "0";
  }
  return new TextEncoder().encode(new XMLSerializer().serializeToString(document)).buffer;
}

export async function importScore(file, onProgress, signal) {
  if (!/\.mscz$/i.test(file.name)) throw new Error("Choisis un fichier .mscz.");
  if (file.size > 50 * 1024 * 1024) throw new Error("Le fichier dépasse la capacité de l’import local (50 Mo).");
  const bytes = await file.arrayBuffer();
  validateArchive(bytes);
  if (signal?.aborted) throw new DOMException("Import annulé.", "AbortError");
  const id = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(x => x.toString(16).padStart(2, "0")).join("");
  const result = await new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./import-worker.js", import.meta.url), {type: "module"});
    const finish = (error, value) => {
      clearTimeout(timer); worker.terminate(); signal?.removeEventListener("abort", abort);
      if (error) reject(error); else resolve(value);
    };
    const abort = () => finish(new DOMException("Import annulé.", "AbortError"));
    const timer = setTimeout(() => finish(new Error("La préparation a dépassé deux minutes. Essaie une partition plus petite.")), 120000);
    signal?.addEventListener("abort", abort, {once: true});
    worker.onmessage = ({data, ports}) => {
      if (data.type === "progress") onProgress(data.message);
      else if (data.type === "migrate-v2") {
        try {
          const bytes = normalizeLegacyHarmony(data.xml);
          ports[0].postMessage({bytes}, [bytes]);
        } catch (error) { ports[0].postMessage({error: error.message}); }
        finally { ports[0].close(); }
      }
      else if (data.type === "result") finish(null, data);
      else if (data.type === "error") finish(new Error(data.message));
    };
    worker.onerror = event => { event.preventDefault(); finish(new Error("Le moteur de lecture n’a pas pu préparer cette partition.")); };
    worker.postMessage({bytes, filename: file.name}, [bytes]);
  });
  return {id, title: result.manifest.title, filename: file.name, source: file,
    importedAt: Date.now(), manifest: result.manifest, pages: result.pages, midi: result.midi, pdf: result.pdf};
}
