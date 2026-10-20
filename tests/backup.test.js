import test from "node:test";
import assert from "node:assert/strict";
import {zipSync} from "../reader/assets/fflate.js";
import {encodeBackup,inspectBackup} from "../reader/backup.js";
import {normalizePreferences} from "../reader/library.js";

async function snapshot(){
  const bytes=zipSync({"score.mscx":new TextEncoder().encode('<museScore version="3.02"><Score/></museScore>')},{level:0});
  const id=Buffer.from(await crypto.subtle.digest("SHA-256",bytes)).toString("hex");
  return {lastScore:id,records:[{id,title:"Nom personnalisé",filename:"original.mscz",importedAt:123,
    source:new Blob([bytes]),settings:{controls:{speed:"0.75",loop:true},parts:[{channel:0,sound:"flute",volume:.5,muted:false,solo:true}]}}]};
}
test("a backup retains original bytes, display names and settings without Base64",async()=>{
  const before=await snapshot(),file=encodeBackup(before),after=await inspectBackup(file);
  assert.equal(after.lastScore,before.lastScore);assert.equal(after.entries.length,1);
  const [record]=after.entries;assert.equal(record.title,"Nom personnalisé");assert.equal(record.filename,"original.mscz");
  assert.deepEqual(record.settings,before.records[0].settings);
  assert.deepEqual(await record.source.arrayBuffer(),await before.records[0].source.arrayBuffer());
});
test("legacy empty and fractional loop inputs survive a complete backup",async()=>{
  for(const value of ["","1.5","-1","1e2"]){
    const before=await snapshot();
    before.records[0].settings.controls={loop:false,loopStart:value,loopEnd:value};
    const after=await inspectBackup(encodeBackup(before));
    assert.deepEqual(after.entries[0].settings,before.records[0].settings);
  }
});
test("truncation, trailing bytes and damaged MSCZ content reject the whole backup",async()=>{
  const file=encodeBackup(await snapshot()),bytes=new Uint8Array(await file.arrayBuffer());
  for(const length of [0,16,bytes.length-1,bytes.length-5])await assert.rejects(inspectBackup(new Blob([bytes.subarray(0,length)])));
  await assert.rejects(inspectBackup(new Blob([bytes,new Uint8Array([1])])));
  const corrupted=bytes.slice();corrupted[corrupted.length-5]^=1;
  await assert.rejects(inspectBackup(new Blob([corrupted])));
});
test("cancellation during inspection does not return a partial restore plan",async()=>{
  const controller=new AbortController(),file=encodeBackup(await snapshot());
  await assert.rejects(inspectBackup(file,()=>controller.abort(),controller.signal),{name:"AbortError"});
});
test("duplicate identifiers in a backup are rejected before restoration",async()=>{
  const value=await snapshot();value.records.push(value.records[0]);
  await assert.rejects(inspectBackup(encodeBackup(value)));
});
test("unknown settings and prototype keys never reach reader controls or instruments",()=>{
  for(const settings of [JSON.parse('{"controls":{"__proto__":{}}}'),{controls:{speed:"99"}},
    {controls:{follow:"true"}}, {controls:{toString:"x"}}, {controls:{loopStart:"non numérique"}},
    {parts:[{channel:16,sound:"flute",volume:1,muted:false,solo:false}]},
    JSON.parse('{"parts":[{"channel":0,"sound":"flute","volume":1,"muted":false,"solo":false,"__proto__":{}}]}')]){
    assert.throws(()=>normalizePreferences(settings));
  }
});
test("a backup trailer must be the end marker, not a JSON null frame",async()=>{
  const file=encodeBackup(await snapshot());
  await assert.rejects(inspectBackup(new Blob([file.slice(0,-4),new Uint8Array([0,0,0,4]),'null'])));
});
