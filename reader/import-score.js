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
  if (count === 65535 || count !== view.getUint16(end + 8, true) || pos + directorySize !== end) invalid();
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

function scoreDocument(xml) {
  const document = new DOMParser().parseFromString(new TextDecoder().decode(xml), "application/xml");
  if (document.querySelector("parsererror") || document.documentElement.tagName !== "museScore") {
    throw new Error("La conversion interne de cette partition a échoué.");
  }
  return document;
}

export async function normalizeLegacyArchive(xml, archive) {
  const {unzipSync, zipSync} = await import("./assets/fflate.js");
  const files = unzipSync(new Uint8Array(archive));
  const container = files["META-INF/container.xml"];
  if (!container) throw new Error("Le fichier MSCZ ne décrit pas sa partition principale.");
  const document = new DOMParser().parseFromString(new TextDecoder().decode(container), "application/xml");
  const path = document.querySelector("rootfiles > rootfile")?.getAttribute("full-path");
  if (!path || !files[path]) throw new Error("La partition principale est absente du fichier MSCZ.");
  files[path] = new Uint8Array(normalizeLegacyScore(xml, files[path]));
  if (Object.values(files).reduce((total, bytes) => total + bytes.length, 0) > 200 * 1024 * 1024) {
    throw new Error("La copie préparée dépasse la capacité de l’import local (200 Mo).");
  }
  // Reload the complete MSCZ, including its Pictures directory. Plain MSCX
  // loses image resources when MuseScore destroys the first loaded score.
  return zipSync(files, {level: 0}).buffer;
}

export function normalizeLegacyScore(xml, originalXml) {
  const document = scoreDocument(xml), original = scoreDocument(originalXml);
  const diagrams = [...document.getElementsByTagName("FretDiagram")];
  const sources = [...original.getElementsByTagName("FretDiagram")];
  if (diagrams.length !== sources.length) throw new Error("Les diagrammes d’accords ne correspondent plus au fichier d’origine.");
  const children = (element, name) => [...element.children].filter(child => child.tagName === name);
  const dots = element => children(element, "string").flatMap(string => children(string, "dot").map(dot => [Number(string.getAttribute("no")), Number(dot.getAttribute("fret") || dot.textContent)]));
  for (const [index, source] of sources.entries()) {
    const oldBarre = children(source, "barre")[0], diagram = diagrams[index];
    const content = children(diagram, "fretDiagram")[0];
    if (oldBarre && Number(oldBarre.textContent) > 0) {
      // MuseScore 2 stored an actual fret; MuseScore 3's legacy reader reduces
      // it to a boolean and chooses the first dot instead. Recover source facts.
      const originalDots = dots(source).sort((a,b) => a[0]-b[0]);
      if (!content || JSON.stringify(originalDots) !== JSON.stringify(dots(content).sort((a,b) => a[0]-b[0]))) {
        throw new Error("Un diagramme d’accord ne correspond plus au fichier d’origine.");
      }
      for (const barre of children(content, "barre")) barre.remove();
      const fret = Number(oldBarre.textContent), start = originalDots.find(([,dot]) => dot === fret)?.[0];
      if (start !== undefined) {
        const barre = document.createElement("barre");
        barre.setAttribute("start", String(start));barre.setAttribute("end", "-1");
        barre.textContent = String(fret);content.append(barre);
      }
    }
    // The reloaded copy targets MuseScore 3; retain its single explicit format.
    if (content) for (const child of [...children(diagram,"string"),...children(diagram,"barre")]) child.remove();
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
  if (signal?.aborted) throw new DOMException("Import annulé.", "AbortError");
  const result = await new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./import-worker.js", import.meta.url), {type: "module"});
    const finish = (error, value) => {
      clearTimeout(timer); worker.terminate(); signal?.removeEventListener("abort", abort);
      if (error) reject(error); else resolve(value);
    };
    const abort = () => finish(new DOMException("Import annulé.", "AbortError"));
    const timer = setTimeout(() => finish(new Error("La préparation a dépassé deux minutes. Essaie une partition plus petite.")), 120000);
    signal?.addEventListener("abort", abort, {once: true});
    worker.onmessage = async ({data, ports}) => {
      if (data.type === "progress") onProgress(data.message);
      else if (data.type === "migrate-v2") {
        try {
          const bytes = await normalizeLegacyArchive(data.xml, data.archive);
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
