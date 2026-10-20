// Display metadata never changes the original MSCZ bytes.
export const MAX_METADATA=1024*1024;
const encoder=new TextEncoder();
export function scoreTitle(title,filename) {
  return (typeof title==="string"&&title.trim()) ||
    (typeof filename==="string"&&filename.replace(/\.mscz$/i,"").trim()) || "Partition sans titre";
}
export function scoreMetadata(record,settings=record.settings) {
  return {id:record.id,title:scoreTitle(record.title,record.filename),filename:record.filename,
    sourceBytes:record.sourceBytes??record.source?.size??50*1024*1024,importedAt:record.importedAt,settings};
}
export function metadataBytes(value) {
  const bytes=encoder.encode(JSON.stringify(value));
  if(bytes.length>MAX_METADATA)throw new Error("Les métadonnées dépassent la capacité de sauvegarde locale (1 Mio par partition).");
  return bytes;
}
