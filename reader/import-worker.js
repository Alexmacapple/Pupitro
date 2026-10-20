import {preparePlayback, preparePositions} from "./playback.js";

// Keep layout work off the UI thread; terminating this worker also frees WASM.
self.MSCORE_SCRIPT_URL = new URL("./assets/webmscore/", import.meta.url).href;
self.window = {location: self.location, encodeURIComponent, addEventListener() {}};
const progress = message => self.postMessage({type: "progress", message});
self.addEventListener("unhandledrejection", event => {
  event.preventDefault();
  self.postMessage({type: "error", message: "Les ressources du moteur de lecture n’ont pas pu être chargées. Reconnecte-toi puis recharge Pupitro."});
  self.close();
});

self.onmessage = async ({data: {bytes, filename}}) => {
  let score;
  try {
    progress("Ouverture de la partition sur cet appareil…");
    const {default: WebMscore} = await import("./assets/webmscore/src/index.js");
    score = await WebMscore.load("mscz", new Uint8Array(bytes));
    const metadata = await score.metadata();
    if (metadata.fileVersion < 300) {
      const xml = await score.saveMsc("mscx"), channel = new MessageChannel();
      const normalized = await new Promise((resolve, reject) => {
        channel.port1.onmessage = ({data}) => {
          channel.port1.close();
          if (data.error) reject(new Error(data.error)); else resolve(data.bytes);
        };
        self.postMessage({type: "migrate-v2", xml: xml.buffer, archive: bytes}, [xml.buffer, bytes, channel.port2]);
      });
      score.destroy(); score = null;
      score = await WebMscore.load("mscz", new Uint8Array(normalized));
    }
    const count = await score.npages();
    if (!count || count > 300) throw new Error("La partition doit contenir entre 1 et 300 pages.");
    const pages = [];
    let size = 0;
    for (let index = 0; index < count; index++) {
      progress(`Préparation de la page ${index + 1} sur ${count}…`);
      const blob = new Blob([await score.saveSvg(index, true)], {type: "image/svg+xml"});
      size += blob.size;
      if (size > 100 * 1024 * 1024) throw new Error("Les pages dépassent la capacité de l’import local (100 Mo).");
      pages.push(blob);
    }
    progress("Préparation du son, du métronome et du curseur…");
    const midiData = await score.saveMidi(true, true);
    const playback = preparePlayback(midiData, {silentDuration: metadata.duration});
    const measures = await score.measurePositions(), segments = await score.segmentPositions();
    const positions = preparePositions(measures, segments, playback, count);
    const pdf = new Blob([await score.savePdf()], {type: "application/pdf"});
    const {midi, secondsTick, ...timing} = playback;
    const title = metadata.title || filename.replace(/\.mscz$/i, "");
    const manifest = {title, renderer: "webmscore-0.22.0", sourceVersion: metadata.mscoreVersion,
      pages: pages.map(() => ({width: segments.pageSize.width, height: segments.pageSize.height})),
      ...timing, ...positions};
    self.postMessage({type: "result", manifest, pages, pdf, midi: midi.buffer}, [midi.buffer]);
  } catch (error) {
    self.postMessage({type: "error", message: error.message || "Ce fichier n’a pas pu être ouvert par le moteur web."});
  } finally {
    if (score) score.destroy();
    self.close();
  }
};
