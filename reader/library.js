// User partitions belong to IndexedDB, separately from the replaceable app cache.
const DATABASE = "pupitro";
let databasePromise;

function database() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("scores", {keyPath: "id"});
        db.createObjectStore("settings");
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); databasePromise = null; };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Ferme les autres fenêtres Pupitro puis réessaie."));
    }).catch(error => { databasePromise = null; throw error; });
  }
  return databasePromise;
}

async function operation(storeName, mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    let request;
    try { request = action(transaction.objectStore(storeName)); }
    catch (error) { transaction.abort(); reject(error); return; }
    transaction.oncomplete = () => resolve(request?.result);
    transaction.onabort = () => reject(transaction.error || request?.error || new Error("Enregistrement local interrompu."));
    transaction.onerror = () => {}; // The abort event reports the final outcome.
  });
}

export function saveScore(record) {
  return operation("scores", "readwrite", store => store.put(record));
}

export function getScore(id) {
  return operation("scores", "readonly", store => store.get(id));
}

export async function listScores() {
  const db = await database();
  // Do not read all page/PDF/MIDI blobs merely to display a library list.
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("scores", "readonly");
    const request = transaction.objectStore("scores").openCursor();
    const records = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const {id, title, importedAt, manifest} = cursor.value;
      records.push({id, title, importedAt, pages: manifest.pages.length});
      cursor.continue();
    };
    transaction.oncomplete = () => resolve(records.sort((a, b) => b.importedAt - a.importedAt));
    transaction.onabort = () => reject(transaction.error || request.error);
  });
}

export function saveSettings(id, value) {
  return operation("settings", "readwrite", store => store.put(value, id));
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
  manifest.pages = manifest.pages.map((page, index) => ({...page, src: url(record.pages[index])}));
  manifest.midiUrl = url(new Blob([record.midi], {type: "audio/midi"}));
  manifest.pdfUrl = url(record.pdf);
  return {manifest, release() { urls.forEach(value => URL.revokeObjectURL(value)); }};
}
