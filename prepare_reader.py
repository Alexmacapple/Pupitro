"""Build a local practice example from unmodified MuseScore 2 exports."""
from pathlib import Path
import argparse
import bisect
import hashlib
import json
import shutil
import struct
import xml.etree.ElementTree as ET

import fitz

ROOT = Path(__file__).parent
parser = argparse.ArgumentParser()
parser.add_argument("--exports", type=Path, default=ROOT)
parser.add_argument("--output", type=Path, default=ROOT / "reader/assets")
parser.add_argument("--asset-url", default="assets/")
parser.add_argument("--pdf", default="reference-gui.pdf")
parser.add_argument("--title", default="Partition")
args = parser.parse_args()
EXPORTS = args.exports
ASSETS = args.output
SITE = ASSETS.parent
ASSETS.mkdir(parents=True, exist_ok=True)
# Shared audio resources belong to scripts/setup_assets.py, not score conversion.
shutil.copyfile(EXPORTS / args.pdf, ASSETS / "partition.pdf")


def vlq(data, pos):
    value = 0
    for _ in range(4):
        byte = data[pos]
        pos += 1
        value = (value << 7) | (byte & 127)
        if byte < 128:
            return value, pos
    raise ValueError("Invalid MIDI variable-length integer")


def encode_vlq(value):
    result = [value & 127]
    value >>= 7
    while value:
        result.insert(0, 128 | (value & 127))
        value >>= 7
    return bytes(result)


raw = (EXPORTS / "reference.mid").read_bytes()
if raw[:4] != b"MThd":
    raise ValueError("Invalid MIDI export")
header_size = int.from_bytes(raw[4:8], "big")
fmt, track_count, ppq = struct.unpack(">HHH", raw[8:14])
if fmt != 1 or ppq & 0x8000:
    raise ValueError("Expected MuseScore's format-1, PPQ MIDI export")
position = 8 + header_size
tempo_events = []
meters = []
channels = {}
last_tick = 0
for track in range(track_count):
    if raw[position:position + 4] != b"MTrk":
        raise ValueError("Missing MIDI track")
    size = int.from_bytes(raw[position + 4:position + 8], "big")
    data = raw[position + 8:position + 8 + size]
    position += 8 + size
    cursor = tick = 0
    running = None
    name = f"Partie {track}"
    while cursor < len(data):
        delta, cursor = vlq(data, cursor)
        tick += delta
        status = data[cursor]
        if status >= 128:
            cursor += 1
            if status < 240:
                running = status
        elif running is not None:
            status = running
        else:
            raise ValueError("Invalid MIDI running status")
        if status == 255:
            kind = data[cursor]
            length, cursor = vlq(data, cursor + 1)
            value = data[cursor:cursor + length]
            cursor += length
            if kind == 3:
                name = value.decode("utf-8", errors="replace")
            elif kind == 0x51:
                tempo_events.append((tick, int.from_bytes(value, "big")))
            elif kind == 0x58:
                meters.append((tick, value[0], 2 ** value[1]))
        elif status in (240, 247):
            length, cursor = vlq(data, cursor)
            cursor += length
        elif 128 <= status < 240:
            count = 1 if (status & 240) in (192, 208) else 2
            value = data[cursor:cursor + count]
            cursor += count
            ch = status & 15
            if (status & 240) == 144 and value[1]:
                channels.setdefault(ch, {"channel": ch, "name": name, "notes": 0})["notes"] += 1
        else:
            raise ValueError(f"Unsupported MIDI status {status}")
        last_tick = max(last_tick, tick)

tempo_by_tick = {0: 500000, **dict(sorted(tempo_events))}
tempo = []
previous_tick = 0
previous_us = 500000
seconds = 0.0
for tick, microseconds in sorted(tempo_by_tick.items()):
    seconds += (tick - previous_tick) * previous_us / ppq / 1_000_000
    tempo.append({"tick": tick, "us": microseconds, "seconds": seconds})
    previous_tick, previous_us = tick, microseconds


def tick_seconds(tick):
    entry = tempo[max(0, bisect.bisect_right([x["tick"] for x in tempo], tick) - 1)]
    return entry["seconds"] + (tick - entry["tick"]) * entry["us"] / ppq / 1_000_000


def seconds_tick(seconds):
    entry = tempo[max(0, bisect.bisect_right([x["seconds"] for x in tempo], seconds) - 1)]
    return round(entry["tick"] + (seconds - entry["seconds"]) * ppq * 1_000_000 / entry["us"])


click_channel = next((ch for ch in range(15, -1, -1) if ch not in channels), None)
if click_channel is None:
    raise ValueError("No free MIDI channel for a synchronized metronome")
meter_by_tick = {0: (4, 4), **{tick: (num, den) for tick, num, den in meters}}
meter_list = sorted(meter_by_tick.items())
clicks = []
for index, (start, (num, den)) in enumerate(meter_list):
    end = meter_list[index + 1][0] if index + 1 < len(meter_list) else last_tick
    step = ppq * 4 / den
    if step <= 0:
        raise ValueError("Invalid meter")
    beat = 0
    while start + beat * step < end:
        tick = round(start + beat * step)
        key, velocity = (76, 92) if beat % num == 0 else (77, 68)
        clicks.append((tick, bytes([144 | click_channel, key, velocity])))
        clicks.append((tick + min(48, max(1, round(step / 8))), bytes([128 | click_channel, key, 0])))
        beat += 1
clicks.sort(key=lambda item: item[0])
click_data = bytearray(b"\x00\xff\x03\x09Metronome")
previous = 0
for tick, event in clicks:
    click_data += encode_vlq(tick - previous) + event
    previous = tick
click_data += encode_vlq(max(0, last_tick - previous)) + b"\xff\x2f\x00"
new_header = raw[:10] + struct.pack(">H", track_count + 1) + raw[12:8 + header_size]
(ASSETS / "score.mid").write_bytes(new_header + raw[8 + header_size:] + b"MTrk" + struct.pack(">I", len(click_data)) + click_data)

pdf = fitz.open(EXPORTS / args.pdf)
if len(pdf) > 300:
    raise ValueError("Cette partition dépasse la capacité de l’essai local (300 pages).")
pages = []
for number, page in enumerate(pdf, 1):
    name = f"page-{number}.png"
    # White-backed raster pages retain the native export, including all glyphs.
    page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False).save(str(ASSETS / name))
    pages.append({"src": f"{args.asset_url}{name}", "width": page.rect.width, "height": page.rect.height})

mpos = ET.parse(EXPORTS / "reference.mpos").getroot()
elements = {int(x.get("id")): x.attrib for x in mpos.findall("./elements/element")}
events = [{"id": int(x.get("elid")), "seconds": int(x.get("position")) / 1000} for x in mpos.findall("./events/event")]
for event in events:
    event["tick"] = seconds_tick(event["seconds"])

# MuseScore 2 savePositions.cpp multiplies its page coordinates by
# (converterDpi / DPI) * 12. These exports were made with -r 160.
# Convert once into page fractions, independent of browser zoom and image DPI.
position_to_points = 72 / (160 * 12)
spos = ET.parse(EXPORTS / "reference.spos").getroot()
segments = {}
for element in spos.findall("./elements/element"):
    page_index = int(element.get("page"))
    page = pages[page_index]
    x = float(element.get("x")) * position_to_points
    y = float(element.get("y")) * position_to_points
    height = float(element.get("sy")) * position_to_points
    if not (0 <= x <= page["width"] and 0 <= y <= page["height"]):
        raise ValueError("Segment position falls outside its native PDF page")
    top = max(0, y - 16)
    bottom = min(page["height"], y + height + 8)
    segments[int(element.get("id"))] = {
        "page": page_index,
        "x": x / page["width"],
        "y": top / page["height"],
        "height": (bottom - top) / page["height"],
    }
cursor_events = []
for event in spos.findall("./events/event"):
    cursor_events.append({
        "tick": seconds_tick(int(event.get("position")) / 1000),
        **segments[int(event.get("elid"))],
    })
if any(a["tick"] > b["tick"] for a, b in zip(cursor_events, cursor_events[1:])):
    raise ValueError("Cursor events must follow playback order, including repeats")

manifest = {
    "title": args.title,
    "sourceVersion": "2.3.2",
    "sourceSha256": hashlib.sha256((EXPORTS / "reference.mscz").read_bytes()).hexdigest(),
    "midiUrl": f"{args.asset_url}score.mid",
    "pdfUrl": f"{args.asset_url}partition.pdf",
    "pages": pages,
    "channels": list(channels.values()),
    "clickChannel": click_channel,
    "ppq": ppq,
    "tempo": tempo,
    "totalTicks": last_tick,
    "duration": tick_seconds(last_tick),
    "measureEvents": events,
    "cursorEvents": cursor_events,
    "measurePages": {str(key): int(value["page"]) for key, value in elements.items()},
    "measureCount": len(elements),
    "firstMeter": list(meter_list[0][1]),
}
(ASSETS / "score.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
print(json.dumps({"site": str(SITE), "pages": len(pages), "parts": list(channels.values()), "duration": manifest["duration"], "measures": len(elements), "metronomeChannel": click_channel}, ensure_ascii=False))
