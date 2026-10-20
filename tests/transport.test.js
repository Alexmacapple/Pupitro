import test from "node:test";
import assert from "node:assert/strict";
import * as playback from "../reader/playback.js";
import {openRecord} from "../reader/library.js";

function changingMeterMidi() {
  const track = new Uint8Array([
    0,255,88,4,4,2,24,8,
    0,144,60,100, 0x8f,0,128,60,0,
    0,255,88,4,6,3,24,8,
    0,144,62,100, 0x8b,0x20,128,62,0,
    0,255,47,0,
  ]);
  const midi = new Uint8Array(22 + track.length);
  midi.set([77,84,104,100,0,0,0,6,0,1,0,1,1,224,77,84,114,107]);
  new DataView(midi.buffer).setUint32(18,track.length);
  midi.set(track,22);
  return midi;
}

const measures = {
  measureCount: 3, totalTicks: 2880,
  measureEvents: [
    {id:0,tick:0},{id:1,tick:480},{id:0,tick:960},
    {id:1,tick:1440},{id:2,tick:1920},
  ],
};

test("loop navigation is unavailable without a score", () => {
  assert.equal(playback.loopBounds(undefined,1,4),null);
});

test("loop bounds reject invalid measures and retain repeats and the last measure", () => {
  for (const [start,end] of [[0,1],[1,999],[1,1.5],[1.5,2],[3,2],[NaN,2],[1,Infinity]]) {
    assert.equal(playback.loopBounds(measures,start,end),null,`${start}..${end}`);
  }
  assert.deepEqual(playback.loopBounds(measures,1,1),{start:0,end:480});
  assert.deepEqual(playback.loopBounds(measures,1,2),{start:0,end:1920});
  assert.deepEqual(playback.loopBounds(measures,3,3),{start:1920,end:2880});
  assert.equal(playback.loopBounds({...measures,measureEvents:[{id:0,tick:0}]},1,2),null);
});

test("MIDI preparation retains every time-signature change", () => {
  const data = playback.preparePlayback(changingMeterMidi());
  assert.deepEqual(data.meterEvents,[
    {tick:0,numerator:4,denominator:4},
    {tick:1920,numerator:6,denominator:8},
  ]);
  assert.deepEqual(data.firstMeter,[4,4]);
  assert.equal(data.totalTicks,3360);
});

test("count-in follows the current meter, tempo and playback speed", () => {
  const data = playback.preparePlayback(changingMeterMidi());
  assert.deepEqual(playback.countInAtTick(data,1919,1),{beats:4,secondsPerBeat:.5});
  assert.deepEqual(playback.countInAtTick(data,1920,1),{beats:6,secondsPerBeat:.25});
  assert.deepEqual(playback.countInAtTick(data,2400,.5),{beats:6,secondsPerBeat:.5});
  data.tempo.push({tick:1920,us:1000000,seconds:2});
  assert.deepEqual(playback.countInAtTick(data,2400,2),{beats:6,secondsPerBeat:.25});
});

test("opening a v0.2.0 record recovers meters without rewriting MIDI or source", () => {
  const prepared = playback.preparePlayback(changingMeterMidi());
  const {midi,secondsTick,...manifest} = prepared;
  delete manifest.meterEvents;
  manifest.pages = [{width:100,height:200}];
  const record = {
    manifest, midi:midi.buffer, source:new Blob(["original MSCZ"]),
    pages:[new Blob(["<svg/>"])], pdf:new Blob(["PDF"],{type:"application/pdf"}),
  };
  const before = midi.slice(), source = record.source;
  const opened = openRecord(record);
  try {
    assert.deepEqual(opened.manifest.meterEvents,[
      {tick:0,numerator:4,denominator:4},
      {tick:1920,numerator:6,denominator:8},
    ]);
    assert.equal(playback.countInAtTick(opened.manifest,2400,1).beats,6);
    assert.deepEqual(new Uint8Array(record.midi),before);
    assert.equal(new DataView(record.midi).getUint16(10),2);
    assert.equal(record.source,source);
    assert.equal(record.manifest.meterEvents,undefined);
  } finally { opened.release(); }
});

test("cursor following uses immediate scrolling when reduced motion is requested", () => {
  assert.deepEqual(playback.cursorScrollOptions(120,true),{top:120,behavior:"auto"});
  assert.deepEqual(playback.cursorScrollOptions(120,false),{top:120,behavior:"smooth"});
  assert.deepEqual(playback.cursorScrollOptions(-5,true),{top:0,behavior:"auto"});
});
