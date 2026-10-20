import test from "node:test";
import assert from "node:assert/strict";
import {zipSync, unzipSync} from "../reader/assets/fflate.js";
import {validateArchive, importScore} from "../reader/import-score.js";
import {createRequire} from "node:module";
import {EventEmitter} from "node:events";

const bytes = value => new TextEncoder().encode(value);
const picture = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
const files = () => ({
  "META-INF/container.xml": bytes('<container><rootfiles><rootfile full-path="score.mscx"/></rootfiles></container>'),
  "score.mscx": bytes('<museScore version="2.06"><Score/></museScore>'),
  "Pictures/rhythm.png": picture,
});
function archive(level = 0) { return zipSync(files(), {level}).buffer; }
function directory(buffer) {
  const view = new DataView(buffer), end = buffer.byteLength - 22;
  let position = view.getUint32(end + 16, true);
  const entries = [];
  for (let i = 0; i < view.getUint16(end + 10, true); i++) {
    entries.push(position);
    position += 46 + view.getUint16(position + 28, true) + view.getUint16(position + 30, true) + view.getUint16(position + 32, true);
  }
  return {view, end, entries};
}
function commented(buffer, comment) {
  const result = new Uint8Array(buffer.byteLength + comment.length);
  result.set(new Uint8Array(buffer)); result.set(comment, buffer.byteLength);
  new DataView(result.buffer).setUint16(buffer.byteLength - 2, comment.length, true);
  return result.buffer;
}
function descriptorArchive(signed) {
  const original = zipSync({"score.mscx": bytes("score")}, {level: 0}).buffer;
  const {view, end, entries} = directory(original), central = entries[0], length = signed ? 16 : 12;
  const result = new Uint8Array(original.byteLength + length);
  result.set(new Uint8Array(original, 0, central));
  result.set(new Uint8Array(original, central), central + length);
  const output = new DataView(result.buffer), descriptor = central + (signed ? 4 : 0);
  if (signed) output.setUint32(central, 0x08074b50, true);
  for (let index = 0; index < 3; index++) output.setUint32(descriptor + index * 4, view.getUint32(central + 16 + index * 4, true), true);
  output.setUint16(6, view.getUint16(6, true) | 8, true);
  for (const offset of [14, 18, 22]) output.setUint32(offset, 0, true);
  output.setUint16(central + length + 8, view.getUint16(central + 8, true) | 8, true);
  output.setUint32(end + length + 16, central + length, true);
  return result.buffer;
}

for (const level of [0, 6]) test(`validated method ${level ? "deflate" : "stored"} retains score and image bytes`, () => {
  const original = archive(level), snapshot = original.slice(0);
  const prepared = validateArchive(original);
  assert.ok(prepared instanceof ArrayBuffer);
  const extracted = unzipSync(new Uint8Array(prepared));
  assert.deepEqual(Object.keys(extracted), Object.keys(files()));
  for (const [name, value] of Object.entries(files())) assert.deepEqual(extracted[name], value);
  assert.deepEqual(original, snapshot);
});

for (const length of [22, 23]) test(`a valid EOCD signature inside a ${length}-byte comment cannot redirect extraction`, () => {
  const comment = new Uint8Array(length); new DataView(comment.buffer).setUint32(0, 0x06054b50, true);
  const original = commented(archive(), comment), snapshot = original.slice(0);
  const prepared = validateArchive(original);
  assert.deepEqual(unzipSync(new Uint8Array(prepared))["Pictures/rhythm.png"], picture);
  assert.equal(new DataView(prepared).getUint16(prepared.byteLength - 2, true), 0);
  assert.equal(prepared.byteLength, original.byteLength - comment.length);
  assert.deepEqual(original, snapshot, "the source archive must keep its original comment");
});

test("an EOCD-like comment with plausible directory bounds falls back to the real directory", () => {
  const buffer = archive(), {view, end, entries} = directory(buffer);
  const comment = new Uint8Array(22), fake = new DataView(comment.buffer);
  fake.setUint32(0, 0x06054b50, true);
  fake.setUint16(8, entries.length, true); fake.setUint16(10, entries.length, true);
  fake.setUint32(12, buffer.byteLength - entries[0], true); fake.setUint32(16, entries[0], true);
  assert.equal(end + 22, buffer.byteLength);
  const original = commented(buffer, comment), snapshot = original.slice(0);
  assert.deepEqual(unzipSync(new Uint8Array(validateArchive(original)))["Pictures/rhythm.png"], picture);
  assert.deepEqual(original, snapshot);
});

for (const signed of [false, true]) test(`a ${signed ? "signed" : "bare"} data descriptor is checked and retained`, () => {
  const original = descriptorArchive(signed), snapshot = original.slice(0);
  assert.deepEqual(unzipSync(new Uint8Array(validateArchive(original)))["score.mscx"], bytes("score"));
  assert.deepEqual(original, snapshot);
  const {view, entries} = directory(original), descriptorEnd = entries[0];
  view.setUint32(descriptorEnd - 4, 123, true);
  assert.throws(() => validateArchive(original));
});

test("a stored payload cannot claim a smaller expanded size", () => {
  const buffer = archive(), {view, entries} = directory(buffer);
  const entry = entries[2], local = view.getUint32(entry + 42, true);
  view.setUint32(entry + 24, 0, true); view.setUint32(local + 22, 0, true);
  assert.throws(() => validateArchive(buffer));
});

test("central entries cannot reuse a local payload under another name", () => {
  const buffer = zipSync({"a.mscx": bytes("score"), "b.mscx": bytes("score")}, {level: 0}).buffer;
  const {view, entries} = directory(buffer);
  view.setUint32(entries[1] + 42, view.getUint32(entries[0] + 42, true), true);
  assert.throws(() => validateArchive(buffer));
});

test("a matching nested local header cannot overlap another payload", () => {
  const inner = zipSync({"b.mscx": bytes("score")}, {level: 0}).buffer;
  const innerStart = directory(inner).view.getUint32(inner.byteLength - 22 + 16, true);
  const buffer = zipSync({"a.mscx": new Uint8Array(inner, 0, innerStart), "b.mscx": bytes("score")}, {level: 0}).buffer;
  const {view, entries} = directory(buffer);
  const firstLocal = view.getUint32(entries[0] + 42, true);
  const data = firstLocal + 30 + view.getUint16(firstLocal + 26, true) + view.getUint16(firstLocal + 28, true);
  view.setUint32(entries[1] + 42, data, true);
  assert.throws(() => validateArchive(buffer));
});

test("duplicate names and traversal aliases are rejected", () => {
  for (const name of ["../score.mscx", "./score.mscx", "/score.mscx", "dir//score.mscx", "dir\\score.mscx", "__proto__"])
    assert.throws(() => validateArchive(zipSync({"score.mscx": bytes("score"), [name]: bytes("extra")}, {level: 0}).buffer));
  const buffer = zipSync({"a.mscx": bytes("score"), "b.mscx": bytes("score")}, {level: 0}).buffer;
  const {view, entries} = directory(buffer);
  const local = view.getUint32(entries[1] + 42, true);
  view.setUint8(entries[1] + 46, 97); view.setUint8(local + 30, 97);
  assert.throws(() => validateArchive(buffer));
});

test("directories may contain attachments but a file cannot also be their parent", () => {
  const normal = {...files(), "Pictures/": new Uint8Array()};
  assert.deepEqual(unzipSync(new Uint8Array(validateArchive(zipSync(normal).buffer)))["Pictures/rhythm.png"], picture);
  for (const entries of [
    {"Pictures": bytes("file"), "Pictures/a.png": picture},
    {"Pictures/a.png": picture, "Pictures": bytes("file")},
    {"Pictures/": picture},
  ]) assert.throws(() => validateArchive(zipSync({"score.mscx": bytes("score"), ...entries}).buffer));
});

test("local header metadata must agree with the central directory", () => {
  for (const [offset, value] of [[6, 1], [8, 8], [14, 123], [18, 0], [22, 0], [30, 0]]) {
    const buffer = archive(), {view, entries} = directory(buffer);
    const local = view.getUint32(entries[0] + 42, true);
    if (offset === 30) view.setUint8(local + offset, value);
    else if ([6, 8].includes(offset)) view.setUint16(local + offset, value, true);
    else view.setUint32(local + offset, value, true);
    assert.throws(() => validateArchive(buffer), `local offset ${offset}`);
  }
});

test("capacity declarations fail without allocating their expanded contents", () => {
  const buffer = archive(6), {view, entries} = directory(buffer);
  const entry = entries[2], local = view.getUint32(entry + 42, true);
  view.setUint32(entry + 24, 201 * 1024 * 1024, true);
  view.setUint32(local + 22, 201 * 1024 * 1024, true);
  assert.throws(() => validateArchive(buffer));
});

for(const commentSize of [0,23])test(`worker transfer preserves original bytes with ${commentSize} comment bytes`, async t => {
  const comment = new Uint8Array(commentSize);
  if(commentSize)new DataView(comment.buffer).setUint32(0, 0x06054b50, true);
  const original = commentSize?commented(archive(), comment):archive(), file = new File([original], "source.mscz");
  const expected = Buffer.from(await crypto.subtle.digest("SHA-256", original)).toString("hex");
  const previous = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  let received, terminated = 0;
  Object.defineProperty(globalThis, "Worker", {configurable: true, value: class {
    postMessage({bytes}) {
      received = structuredClone(bytes, {transfer: [bytes]});
      queueMicrotask(() => this.onmessage({data: {type: "result", manifest: {title: "Test"}, pages: [], midi: new ArrayBuffer(0), pdf: new Blob()}}));
    }
    terminate() { terminated++; }
  }});
  t.after(() => { if (previous) Object.defineProperty(globalThis, "Worker", previous); else delete globalThis.Worker; });
  const record = await importScore(file, () => {});
  assert.equal(record.id, expected); assert.ok(record.source instanceof Blob);
  assert.deepEqual(await record.source.arrayBuffer(), original);
  assert.deepEqual(unzipSync(new Uint8Array(received))["Pictures/rhythm.png"], picture);
  assert.equal(received.byteLength, original.byteLength - comment.length);
  assert.equal(terminated, 1);
});

test("browser observations remain enforced after creating a second context", async () => {
  const {launchObservedContext, assertObservations} = createRequire(import.meta.url)("./browser.cjs");
  const observations = {errors: [], posts: [], outside: [], consoleCounts: new Map()};
  const contexts = [new EventEmitter(), new EventEmitter()];
  for (const context of contexts) context.pages = () => [];
  const browser = {async launchPersistentContext() { return contexts.shift(); }};
  const first = await launchObservedContext(browser, "unused", {}, "https://example.invalid/app/", observations);
  const second = await launchObservedContext(browser, "unused", {}, "https://example.invalid/app/", observations);
  assert.notEqual(first, second);
  assertObservations(observations);
  const page = new EventEmitter(); second.emit("page", page);
  page.emit("pageerror", new Error("restart-only error"));
  assert.throws(() => assertObservations(observations), /restart-only error/);
  observations.errors.length = 0;
  second.emit("request", {method: () => "POST", url: () => "https://other.invalid/"});
  assert.deepEqual(observations.posts, ["https://other.invalid/"]);
  assert.deepEqual(observations.outside, ["https://other.invalid/"]);
  assert.throws(() => assertObservations(observations));
});
