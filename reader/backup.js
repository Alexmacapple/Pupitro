import {readScoreSource} from "./import-score.js";
import {normalizePreferences} from "./library.js";

const encoder = new TextEncoder(), decoder = new TextDecoder("utf-8",{fatal:true});
const MAGIC = encoder.encode("PUPITRO-LIBRARY\n1\n");
// Frame metadata is decoded as JSON; originals remain separate Blob slices.
const MAX_METADATA = 1024 * 1024, MAX_SOURCE = 50 * 1024 * 1024;
const invalid = () => { throw new Error("La sauvegarde Pupitro est invalide ou incomplète."); };
const cancelled = signal => { if (signal?.aborted) throw new DOMException("Restauration annulée.","AbortError"); };
function sizeBytes(size) { const bytes=new Uint8Array(4);new DataView(bytes.buffer).setUint32(0,size);return bytes; }
function frame(value) {
  const bytes=encoder.encode(JSON.stringify(value));
  if (bytes.length>MAX_METADATA) throw new Error("Les métadonnées dépassent la capacité de sauvegarde locale (1 Mo par partition).");
  return [sizeBytes(bytes.length),bytes];
}
function metadata(value) {
  if (!value || typeof value!=="object" || Array.isArray(value) ||
      typeof value.id!=="string" || !/^[a-f0-9]{64}$/.test(value.id) ||
      typeof value.title!=="string" || !value.title.trim() ||
      typeof value.filename!=="string" || !/\.mscz$/i.test(value.filename) ||
      !Number.isSafeInteger(value.sourceBytes) || value.sourceBytes<22 || value.sourceBytes>MAX_SOURCE ||
      !Number.isFinite(value.importedAt) || value.importedAt<0) invalid();
  return {id:value.id,title:value.title,filename:value.filename,sourceBytes:value.sourceBytes,
    importedAt:value.importedAt,settings:normalizePreferences(value.settings)};
}

export function encodeBackup(snapshot) {
  const parts=[MAGIC,...frame({count:snapshot.records.length,lastScore:snapshot.lastScore||null})];
  for (const record of snapshot.records) {
    if (!(record.source instanceof Blob)) invalid();
    const entry=metadata({...record,sourceBytes:record.source.size});
    parts.push(...frame(entry),record.source);
  }
  parts.push(sizeBytes(0));
  return new Blob(parts,{type:"application/octet-stream"});
}

export async function inspectBackup(file, onProgress=()=>{}, signal) {
  cancelled(signal);
  if (file.size<MAGIC.length+8) invalid();
  const magic=new Uint8Array(await file.slice(0,MAGIC.length).arrayBuffer());
  if (!MAGIC.every((byte,index)=>magic[index]===byte)) invalid();
  let position=MAGIC.length;
  const nextFrame=async()=>{
    cancelled(signal);
    if (position+4>file.size) invalid();
    const size=new DataView(await file.slice(position,position+4).arrayBuffer()).getUint32(0);position+=4;
    if (!size) return undefined;
    if (size>MAX_METADATA || position+size>file.size) invalid();
    let value;
    try { value=JSON.parse(decoder.decode(await file.slice(position,position+size).arrayBuffer())); }
    catch { invalid(); }
    position+=size;return value;
  };
  const header=await nextFrame();
  if (!header || !Number.isSafeInteger(header.count) || header.count<0 || header.count>Math.floor(file.size/4) ||
      (header.lastScore!==null && (typeof header.lastScore!=="string" || !/^[a-f0-9]{64}$/.test(header.lastScore)))) invalid();
  const entries=[],ids=new Set();
  for (let index=0;index<header.count;index++) {
    const entry=metadata(await nextFrame());
    if (ids.has(entry.id) || position+entry.sourceBytes>file.size) invalid();
    ids.add(entry.id);
    const source=new File([file.slice(position,position+entry.sourceBytes)],entry.filename,{type:"application/octet-stream"});
    position+=entry.sourceBytes;
    onProgress(`Vérification de la sauvegarde : ${index+1}/${header.count}…`);
    const checked=await readScoreSource(source,signal);
    if (checked.id!==entry.id) throw new Error("Un MSCZ de la sauvegarde est endommagé. Aucune partition n’a été restaurée.");
    entries.push({...entry,source});
  }
  if (await nextFrame()!==undefined || position!==file.size) invalid();
  if (header.lastScore!==null && !ids.has(header.lastScore)) invalid();
  cancelled(signal);
  return {entries,lastScore:header.lastScore};
}
