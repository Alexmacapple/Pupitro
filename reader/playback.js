// Normalize the engine's MIDI and page coordinates once, at the import boundary.
const decoder = new TextDecoder();
function fail() { throw new Error("Export MIDI invalide ou non pris en charge."); }
function vlq(data, state) {
  let value = 0;
  for (let i = 0; i < 4; i++) {
    if (state.pos >= data.length) fail();
    const byte = data[state.pos++];
    value = value * 128 + (byte & 127);
    if (byte < 128) return value;
  }
  fail();
}
function encode(value) {
  const bytes = [value & 127];
  while ((value = Math.floor(value / 128))) bytes.unshift(128 | (value & 127));
  return bytes;
}

export function preparePlayback(raw, {silentDuration = 0} = {}) {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const text = (at, length) => decoder.decode(raw.subarray(at, at + length));
  if (raw.length < 14 || text(0, 4) !== "MThd") fail();
  const headerSize = view.getUint32(4), format = view.getUint16(8);
  const count = view.getUint16(10), ppq = view.getUint16(12);
  if (headerSize < 6 || headerSize + 8 > raw.length || format > 1 || !count || count >= 65535 || !ppq || ppq & 0x8000) fail();
  const channels = new Map(), tempos = new Map([[0, 500000]]), meters = new Map([[0, [4, 4]]]);
  let position = headerSize + 8, lastTick = 0;
  for (let track = 0; track < count; track++) {
    if (position + 8 > raw.length || text(position, 4) !== "MTrk") fail();
    const size = view.getUint32(position + 4);
    if (position + 8 + size > raw.length) fail();
    const data = raw.subarray(position + 8, position + 8 + size);
    position += 8 + size;
    const state = {pos: 0};
    let tick = 0, running = null, name = `Partie ${track + 1}`;
    while (state.pos < data.length) {
      tick += vlq(data, state);
      if (!Number.isSafeInteger(tick)) fail();
      let status = data[state.pos];
      if (status >= 128) { state.pos++; if (status < 240) running = status; }
      else if (running !== null) status = running;
      else fail();
      if (status === 255) {
        const kind = data[state.pos++], length = vlq(data, state);
        const value = data.subarray(state.pos, state.pos + length);
        if (value.length !== length) fail();
        state.pos += length;
        if (kind === 3) name = decoder.decode(value);
        if (kind === 0x51) {
          if (length !== 3) fail();
          const us = value[0] * 65536 + value[1] * 256 + value[2];
          if (!us) fail();
          tempos.set(tick, us);
        }
        if (kind === 0x58) {
          if (length !== 4 || !value[0] || value[1] > 7) fail();
          meters.set(tick, [value[0], 2 ** value[1]]);
        }
      } else if (status === 240 || status === 247) {
        running = null;
        const length = vlq(data, state);
        state.pos += length;
        if (state.pos > data.length) fail();
      } else if (status >= 128 && status < 240) {
        const kind = status & 240, length = kind === 192 || kind === 208 ? 1 : 2;
        const value = data.subarray(state.pos, state.pos + length);
        if (value.length !== length || [...value].some(byte => byte > 127)) fail();
        state.pos += length;
        if (kind === 144 && value[1]) {
          const channel = status & 15;
          if (!channels.has(channel)) channels.set(channel, {channel, name, notes: 0});
          channels.get(channel).notes++;
        }
      } else fail();
      lastTick = Math.max(lastTick, tick);
    }
  }
  if (position !== raw.length) fail();
  const tempo = [];
  let previousTick = 0, previousUs = 500000, seconds = 0;
  for (const [tick, us] of [...tempos].sort((a, b) => a[0] - b[0])) {
    seconds += (tick - previousTick) * previousUs / ppq / 1e6;
    tempo.push({tick, us, seconds}); previousTick = tick; previousUs = us;
  }
  function secondsTick(time) {
    let entry = tempo[0];
    for (const item of tempo) { if (item.seconds > time) break; entry = item; }
    return Math.round(entry.tick + (time - entry.seconds) * ppq * 1e6 / entry.us);
  }
  // MuseScore can end an all-rest MIDI track at tick 1. Its score metadata
  // supplies the missing silent timeline; note-bearing MIDI remains authoritative.
  if (!channels.size && Number.isFinite(silentDuration) && silentDuration > 0) {
    lastTick = Math.max(lastTick, secondsTick(silentDuration));
  }
  if (!Number.isSafeInteger(lastTick) || !lastTick) fail();
  const lastTempo = tempo.at(-1);
  const duration = lastTempo.seconds + (lastTick - lastTempo.tick) * lastTempo.us / ppq / 1e6;
  const clickChannel = Array.from({length: 16}, (_, i) => 15 - i).find(ch => !channels.has(ch));
  if (clickChannel === undefined) throw new Error("Les 16 canaux MIDI sont utilisés : aucun canal libre pour le métronome.");
  const meterList = [...meters].sort((a, b) => a[0] - b[0]);
  const clicks = [];
  for (let i = 0; i < meterList.length; i++) {
    const [start, [num, den]] = meterList[i], end = meterList[i + 1]?.[0] ?? lastTick;
    const step = ppq * 4 / den, beats = Math.ceil((end - start) / step);
    // Bound the additional MIDI track to a few MB on mobile devices.
    if (clicks.length + beats * 2 > 500000) throw new Error("Cette partition dépasse la capacité du métronome local.");
    for (let beat = 0; beat < beats; beat++) {
      const tick = Math.round(start + beat * step), key = beat % num ? 77 : 76;
      clicks.push([tick, [144 | clickChannel, key, beat % num ? 68 : 92]]);
      clicks.push([tick + Math.min(48, Math.max(1, Math.round(step / 8))), [128 | clickChannel, key, 0]]);
    }
  }
  clicks.sort((a, b) => a[0] - b[0]);
  const clickData = [0, 255, 3, 9, ...new TextEncoder().encode("Metronome")];
  let previous = 0;
  for (const [tick, event] of clicks) { clickData.push(...encode(tick - previous), ...event); previous = tick; }
  clickData.push(...encode(Math.max(0, lastTick - previous)), 255, 47, 0);
  const midi = new Uint8Array(raw.length + 8 + clickData.length);
  midi.set(raw); midi.set(new TextEncoder().encode("MTrk"), raw.length);
  const midiView = new DataView(midi.buffer);
  midiView.setUint16(8, 1); midiView.setUint16(10, count + 1);
  midiView.setUint32(raw.length + 4, clickData.length); midi.set(clickData, raw.length + 8);
  return {midi, channels: [...channels.values()], clickChannel, ppq, tempo,
    totalTicks: lastTick, duration, firstMeter: meterList[0][1], secondsTick};
}

export function preparePositions(measures, segments, playback, pageCount) {
  const {width, height} = segments.pageSize;
  if (!(width > 0 && height > 0)) throw new Error("Dimensions de partition invalides.");
  const elements = new Map(segments.elements.map(item => [item.id, item]));
  const cursorEvents = segments.events.map(event => {
    const item = elements.get(event.elid);
    if (!item || !Number.isInteger(item.page) || item.page < 0 || item.page >= pageCount ||
        ![item.x, item.y, item.sx, item.sy, event.position].every(Number.isFinite) ||
        item.x < 0 || item.x > width || item.y < 0 || item.y > height || item.sx < 0 || item.sy < 0) {
      throw new Error("Les positions exportées ne correspondent pas aux pages.");
    }
    const top = Math.max(0, item.y - height * .01);
    return {tick: playback.secondsTick(event.position / 1000), page: item.page,
      x: item.x / width, width: Math.min(1-item.x/width,item.sx/width),
      y: top / height, height: Math.min(1 - top / height, item.sy / height + .02)};
  });
  const measureEvents = measures.events.map(event => ({id: event.elid, tick: playback.secondsTick(event.position / 1000)}));
  if (!cursorEvents.length || !measureEvents.length ||
      cursorEvents.some((item, i) => i && item.tick < cursorEvents[i - 1].tick) ||
      measureEvents.some((item, i) => i && item.tick < measureEvents[i - 1].tick)) {
    throw new Error("Ordre de lecture des positions invalide.");
  }
  return {cursorEvents, measureEvents, measureCount: measures.elements.length,
    measurePages: Object.fromEntries(measures.elements.map(item => [item.id, item.page]))};
}

export function positionAtPoint(events, page, x, y, currentTick = 0) {
  if (![x,y].every(Number.isFinite) || x<0 || x>1 || y<0 || y>1) return null;
  let nearest=null,distance=Infinity;
  for (const event of events) {
    if (event.page!==page || y<event.y || y>event.y+event.height) continue;
    const dx=Math.max(event.x-x,x-event.x-(event.width||0),0);
    if (dx>.025) continue;
    if (dx<distance || dx===distance && Math.abs(event.tick-currentTick)<Math.abs(nearest.tick-currentTick)) {
      nearest=event;distance=dx;
    }
  }
  return nearest;
}
