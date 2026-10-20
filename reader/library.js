// User partitions belong to IndexedDB, separately from the replaceable app cache.
import {readMidiTiming} from "./playback.js";

const DATABASE = "pupitro";
let databasePromise;
const catalogEntry = record => ({id:record.id,title:record.title,filename:record.filename,
  importedAt:record.importedAt,pages:record.manifest.pages.length});

function database() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 2);
      let abandoned = false, upgradeFailure;
      request.onupgradeneeded = event => {
        const db = request.result;
        if (event.oldVersion < 1) {
          db.createObjectStore("scores", {keyPath: "id"});
          db.createObjectStore("settings");
        }
        const catalog = db.createObjectStore("catalog", {keyPath:"id"});
        // One atomic migration of v1 metadata; originals and prepared files stay put.
        const cursor = request.transaction.objectStore("scores").openCursor();
        cursor.onsuccess = () => {
          try {
            if (!cursor.result) return;
            catalog.put(catalogEntry(cursor.result.value));
            cursor.result.continue();
          } catch (error) { upgradeFailure=error;request.transaction.abort(); }
        };
      };
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned) { db.close(); return; }
        db.onversionchange = () => { db.close(); databasePromise = null; };
        resolve(db);
      };
      request.onerror = () => reject(upgradeFailure || request.error);
      request.onblocked = () => { abandoned = true; reject(new Error("Ferme les autres fenêtres Pupitro puis réessaie.")); };
    }).catch(error => { databasePromise = null; throw error; });
  }
  return databasePromise;
}

async function transaction(storeNames, mode, action, signal) {
  const db = await database();
  if (signal?.aborted) throw new DOMException("Opération annulée.","AbortError");
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result = () => undefined, failure;
    const abort = error => { if (failure) return;failure = error;tx.abort(); };
    const success = (request, handle) => {
      request.onsuccess = () => { if (failure) return;try { handle(request.result); } catch (error) { abort(error); } };
    };
    const cancel = () => abort(new DOMException("Opération annulée.","AbortError"));
    const cleanup = () => signal?.removeEventListener("abort",cancel);
    signal?.addEventListener("abort",cancel,{once:true});
    tx.oncomplete = () => { cleanup();try { resolve(result()); } catch (error) { reject(error); } };
    tx.onabort = () => { cleanup();reject(failure || tx.error || new Error("Enregistrement local interrompu.")); };
    tx.onerror = () => {}; // Abort reports the final outcome, including quota errors.
    try { result = action(tx, abort, success) || result; }
    catch (error) { abort(error); }
  });
}

function operation(storeName, mode, action) {
  return transaction([storeName], mode, tx => {
    const request = action(tx.objectStore(storeName));
    return () => request?.result;
  });
}

export async function saveScore(record, {ifAbsent=false,title,settings,signal} = {}) {
  const preferences = settings === undefined ? undefined : normalizePreferences(settings);
  return transaction(["scores","catalog","settings"], "readwrite", (tx,abort,success) => {
    const catalog = tx.objectStore("catalog"), existing = catalog.get(record.id);
    let written = false;
    success(existing, previous => {
      if (ifAbsent && previous) return;
      const entry = catalogEntry(record);
      if (previous) entry.title = previous.title;
      else if (title !== undefined) entry.title = title;
      tx.objectStore("scores").put(record);
      catalog.put(entry);
      if (!previous && preferences !== undefined) tx.objectStore("settings").put(preferences,record.id);
      written = true;
    });
    return () => written;
  },signal);
}

export function getScoreInfo(id) { return operation("catalog","readonly",store=>store.get(id)); }

export function getScore(id) {
  return transaction(["scores","catalog"], "readonly", tx => {
    const record = tx.objectStore("scores").get(id), entry = tx.objectStore("catalog").get(id);
    return () => record.result ? {...record.result,title:entry.result?.title ?? record.result.title} : undefined;
  });
}

export async function listScores() {
  // Only the separate lightweight catalog is read, whatever the library size.
  const records = await operation("catalog", "readonly", store => store.getAll());
  return records.sort((a, b) => b.importedAt - a.importedAt || a.id.localeCompare(b.id));
}

export function renameScore(id, title) {
  if (typeof title !== "string" || !title.trim()) return Promise.reject(new Error("Saisis un nom pour cette partition."));
  return transaction(["catalog"], "readwrite", (tx, abort, success) => {
    const store = tx.objectStore("catalog"), request = store.get(id);
    let entry;
    success(request, previous => {
      if (!previous) { abort(new Error("Cette partition n’est plus disponible.")); return; }
      entry = {...previous,title:title.trim()};
      store.put(entry);
    });
    return () => entry;
  });
}

export function deleteScore(id) {
  return transaction(["scores","catalog","settings"], "readwrite", (tx,abort,success) => {
    tx.objectStore("scores").delete(id);
    tx.objectStore("catalog").delete(id);
    const settings = tx.objectStore("settings"), last = settings.get("last-score");
    settings.delete(id);
    success(last, value => { if (value === id) settings.delete("last-score"); });
  });
}

export async function saveSettings(id, value) {
  if (id !== "last-score") value = normalizePreferences(value);
  return transaction(["settings","catalog"], "readwrite", (tx,abort,success) => {
    const record = tx.objectStore("catalog").get(id === "last-score" ? value : id);
    // In-flight writes from another window must not resurrect deleted settings.
    success(record, entry => { if (entry) tx.objectStore("settings").put(value, id); });
  });
}

// The persisted settings contract is also the backup boundary; unknown keys
// never reach the reader's controls or Object.assign on an instrument part.
export function normalizePreferences(value) {
  if (value == null) return undefined;
  const fail = () => { throw new Error("Les réglages de la sauvegarde sont invalides ou incompatibles."); };
  const object = x => x && typeof x === "object" && !Array.isArray(x);
  if (!object(value) || Object.keys(value).some(key=>!["controls","parts"].includes(key))) fail();
  const result = {};
  if (value.controls !== undefined) {
    if (!object(value.controls)) fail();
    result.controls = {};
    const choices = {zoom:["100","125","150","200"],speed:["0.5","0.75","0.9","1","1.1","1.25","1.5","2"]};
    for (const [key,item] of Object.entries(value.controls)) {
      if (Object.hasOwn(choices,key)) { if (!choices[key].includes(item)) fail(); }
      else if (["metronome","precount","follow","loop"].includes(key)) { if (typeof item !== "boolean") fail(); }
      else if (["master","clickVolume"].includes(key)) { if (typeof item !== "string" || !item.trim() || !Number.isFinite(Number(item)) || Number(item)<0 || Number(item)>100) fail(); }
      // Number inputs can persist blank or unfinished bounds, even with a min.
      // Playback owns their validity; saving a draft must preserve legacy data.
      else if (["loopStart","loopEnd"].includes(key)) { if (typeof item !== "string" || (item!=="" && (!item.trim() || !Number.isFinite(Number(item))))) fail(); }
      else fail();
      result.controls[key] = item;
    }
  }
  if (value.parts !== undefined) {
    if (!Array.isArray(value.parts) || value.parts.length>16) fail();
    const channels = new Set();
    result.parts = value.parts.map(part=>{
      if (!object(part) || Object.keys(part).some(key=>!["channel","sound","volume","muted","solo"].includes(key)) ||
          !Number.isInteger(part.channel) || part.channel<0 || part.channel>15 || channels.has(part.channel) ||
          !["percussion","guitar","ukulele","mandolin","flute","accordion"].includes(part.sound) ||
          !Number.isFinite(part.volume) || part.volume<0 || part.volume>1 || typeof part.muted!=="boolean" || typeof part.solo!=="boolean") fail();
      channels.add(part.channel);
      return {channel:part.channel,sound:part.sound,volume:part.volume,muted:part.muted,solo:part.solo};
    });
  }
  return result;
}

export function snapshotLibrary() {
  // One consistent read transaction, retaining only originals and metadata.
  // Blob references are not decoded or converted to Base64 in JavaScript.
  return transaction(["scores","catalog","settings"],"readonly",(tx,abort,success)=>{
    const records = [], catalog = tx.objectStore("catalog"), settings = tx.objectStore("settings");
    const last = settings.get("last-score"), request = catalog.openCursor();
    success(request, cursor => {
      if (!cursor) return;
      const entry = cursor.value, raw = tx.objectStore("scores").get(entry.id), prefs = settings.get(entry.id);
      let pending = 2;
      const ready = () => {
        if (--pending) return;
        if (!raw.result) { abort(new Error("Une partition de la bibliothèque est indisponible.")); return; }
        records.push({...entry,source:raw.result.source,settings:prefs.result});
        cursor.continue();
      };
      success(raw,ready);success(prefs,ready);
    });
    return () => ({records,lastScore:last.result});
  });
}

export function getSettings(id) {
  return operation("settings", "readonly", store => store.get(id));
}

export async function storageState() {
  const manager = navigator.storage;
  const estimate = manager?.estimate ? await manager.estimate() : {};
  const persistent = manager?.persisted ? await manager.persisted() : false;
  return {...estimate, persistent};
}

export async function requestPersistence() {
  return navigator.storage?.persist ? navigator.storage.persist() : false;
}

export function openRecord(record) {
  const urls = [];
  const url = data => { const value = URL.createObjectURL(data); urls.push(value); return value; };
  const manifest = structuredClone(record.manifest);
  manifest.title = record.title;
  // v0.2.0 stored only the opening meter. Reuse its existing prepared MIDI;
  // do not reconvert the source or append another metronome track.
  if (!manifest.meterEvents?.length) {
    manifest.meterEvents = readMidiTiming(new Uint8Array(record.midi)).meterEvents;
  }
  manifest.pages = manifest.pages.map((page, index) => ({...page, src: url(record.pages[index])}));
  manifest.midiUrl = url(new Blob([record.midi], {type: "audio/midi"}));
  manifest.pdfUrl = url(record.pdf);
  return {manifest, release() { urls.forEach(value => URL.revokeObjectURL(value)); }};
}
