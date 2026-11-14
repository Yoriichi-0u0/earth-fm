"""Verify the frozen SVS source and generate or check the circular panel PNGs."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import zlib


def digest(data):
    return hashlib.sha256(data).hexdigest()


def chunk(kind, payload):
    return (
        struct.pack(">I", len(payload))
        + kind
        + payload
        + struct.pack(">I", zlib.crc32(kind + payload))
    )


def encode_png(rgb, size):
    stride = size * 3
    rows = b"".join(b"\x00" + rgb[start:start + stride] for start in range(0, len(rgb), stride))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(rows, 9))
        + chunk(b"IEND", b"")
    )


def panel_pixels(rgb, width, height, panel):
    x0, y0, size = panel["x"], panel["y"], panel["size"]
    if min(x0, y0, size) < 0 or size == 0 or x0 + size > width or y0 + size > height:
        raise ValueError("Panel geometry exceeds the frozen source")
    pixels = bytearray(size * size * 3)
    for y in range(size):
        dy = 2 * y + 1 - size
        for x in range(size):
            dx = 2 * x + 1 - size
            if dx * dx + dy * dy <= size * size:
                source_at = ((y + y0) * width + x + x0) * 3
                panel_at = (y * size + x) * 3
                pixels[panel_at:panel_at + 3] = rgb[source_at:source_at + 3]
    return bytes(pixels)


def decode_rgb(path):
    return subprocess.check_output([
        "ffmpeg", "-hide_banner", "-v", "error", "-i", str(path),
        "-frames:v", "1", "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
    ])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write derived PNGs and their hashes")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    manifest = root / "provenance.json"
    data = json.loads(manifest.read_text())
    source = data["source"]
    original = root / "assets" / source["file"]
    if digest(original.read_bytes()) != source["sha256"]:
        raise ValueError("Frozen SVS source SHA-256 does not match")
    rgb = decode_rgb(original)
    if len(rgb) != source["width"] * source["height"] * 3:
        raise ValueError("Decoded image dimensions do not match")
    if args.write:
        source["decodedRgbSha256"] = digest(rgb)
    elif digest(rgb) != source["decodedRgbSha256"]:
        raise ValueError("RGB decode differs from the recorded FFmpeg decode")
    for year, panel in data["panels"].items():
        pixels = panel_pixels(rgb, source["width"], source["height"], panel)
        path = root / "assets" / panel["file"]
        if args.write:
            path.write_bytes(encode_png(pixels, panel["size"]))
            panel.update(bytes=path.stat().st_size, sha256=digest(path.read_bytes()), rgbSha256=digest(pixels))
        if digest(path.read_bytes()) != panel["sha256"] or digest(pixels) != panel["rgbSha256"]:
            raise ValueError(f"{year} panel hash mismatch")
        if decode_rgb(path) != pixels:
            raise ValueError(f"{year} encoded panel pixels differ from the expected mask")
        print(f"{year}: {panel['size']} × {panel['size']}, {panel['sha256']}")
    if args.write:
        manifest.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
