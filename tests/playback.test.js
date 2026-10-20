import test from "node:test";
import assert from "node:assert/strict";
import {preparePlayback, preparePositions} from "../reader/playback.js";
import {validateArchive} from "../reader/import-score.js";

function midi(events) {
  const track = new Uint8Array([...events, 0,255,47,0]);
  const result = new Uint8Array(22 + track.length);
  result.set([77,84,104,100,0,0,0,6,0,1,0,1,1,224,77,84,114,107]);
  new DataView(result.buffer).setUint32(18,track.length);
  result.set(track,22);return result;
}
const note = [0,144,60,100, 0x83,0x60,128,60,0];

test("tempo changes share a timebase with positions and metronome",()=>{
  const data=preparePlayback(midi([0,255,81,3,7,161,32,...note,0,255,81,3,15,66,64,...note]));
  assert.equal(data.totalTicks,960);
  assert.equal(data.duration,1.5);
  assert.equal(data.secondsTick(.5),480);
  assert.equal(data.secondsTick(1.5),960);
  assert.equal(data.channels[0].notes,2);
  assert.ok(!data.channels.some(part=>part.channel===data.clickChannel));
  const parsedAgain=preparePlayback(data.midi);
  assert.equal(parsedAgain.totalTicks,960);
  assert.equal(parsedAgain.channels.length,2);
});

test("SysEx lengths and running status do not lose events",()=>{
  const data=preparePlayback(midi([0,240,2,1,247,0,144,60,100,0,64,80,0x83,0x60,128,60,0]));
  assert.equal(data.channels[0].notes,2);
  assert.equal(data.totalTicks,480);
});

test("malformed and truncated MIDI fail instead of hanging or inventing notes",()=>{
  assert.throws(()=>preparePlayback(new Uint8Array(12)));
  assert.throws(()=>preparePlayback(midi([0,240,127,1])));
  assert.throws(()=>preparePlayback(midi([0,144,60,255])));
  const smpte=midi(note);smpte[12]=128;assert.throws(()=>preparePlayback(smpte));
});

test("repeats retain playback order while coordinates belong to the exported pages",()=>{
  const playback=preparePlayback(midi(note));
  const measures={elements:[{id:0,page:0},{id:1,page:1}],events:[{elid:0,position:0},{elid:1,position:100},{elid:0,position:300}]};
  const segments={pageSize:{width:1000,height:2000},elements:[{id:0,page:0,x:200,y:300,sy:100},{id:1,page:1,x:50,y:200,sy:200}],events:measures.events};
  const positions=preparePositions(measures,segments,playback,2);
  assert.deepEqual(positions.measureEvents.map(item=>item.id),[0,1,0]);
  assert.deepEqual(positions.cursorEvents.map(item=>item.page),[0,1,0]);
  assert.equal(positions.cursorEvents[0].x,.2);
  segments.elements[1].page=2;
  assert.throws(()=>preparePositions(measures,segments,playback,2));
});

function archive(unpacked=10) {
  const filename=new TextEncoder().encode("score.mscx");
  const result=new Uint8Array(30+filename.length+46+filename.length+22);
  const view=new DataView(result.buffer),central=30+filename.length,end=central+46+filename.length;
  view.setUint32(0,0x04034b50,true);view.setUint16(26,filename.length,true);result.set(filename,30);
  view.setUint32(central,0x02014b50,true);view.setUint32(central+24,unpacked,true);
  view.setUint16(central+28,filename.length,true);result.set(filename,central+46);
  view.setUint32(end,0x06054b50,true);view.setUint16(end+8,1,true);view.setUint16(end+10,1,true);
  view.setUint32(end+12,46+filename.length,true);view.setUint32(end+16,central,true);
  return result.buffer;
}
test("ZIP expansion and malformed directory fail before starting WebAssembly",()=>{
  assert.doesNotThrow(()=>validateArchive(archive()));
  assert.throws(()=>validateArchive(archive(201*1024*1024)));
  assert.throws(()=>validateArchive(new ArrayBuffer(20)));
  const encrypted=archive();new DataView(encrypted).setUint16(30+10+8,1,true);
  assert.throws(()=>validateArchive(encrypted));
});
