"""Verify frozen NASA EXRs and generate the two browser maps with FFmpeg and Python."""
import argparse
from array import array
from hashlib import sha256
from itertools import chain
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT, SCALE = 4096, 2048, 4
OUT_WIDTH, OUT_HEIGHT = WIDTH // SCALE, HEIGHT // SCALE
SOURCES = {
    "20251010": "d8e8f082a9d4a822a2383cd2c7ce9e997ba28b6a00bf6a682b7610ba50e9a230",
    "20261010": "58cf8e8c16255dcefc44e653c4aea8284b3a93d2f5a55cb7b642d45eba423e56",
}
BASE = "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005176/frames/4096x2048_2x1_30p/sst_mur_anomaly_pacific/"


def srgb(value):
    encoded = 12.92 * value if value <= 0.0031308 else 1.055 * value ** (1 / 2.4) - 0.055
    return round(255 * encoded)


def decode(path):
    pixels = array("f")
    pixels.frombytes(subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(path), "-frames:v", "1",
        "-pix_fmt", "gbrapf32le", "-f", "rawvideo", "-",
    ]))
    if sys.byteorder != "little":
        pixels.byteswap()
    size = WIDTH * HEIGHT
    if len(pixels) != 4 * size:
        raise ValueError(f"{path}: unexpected frame size")
    red, green, blue, alpha = (memoryview(pixels)[p * size:(p + 1) * size] for p in (2, 0, 1, 3))
    if any(value != 1 for value in alpha):
        raise ValueError(f"{path}: expected opaque alpha throughout")
    if any(not math.isfinite(value) or value < 0 or value > 1 for value in chain(red, green, blue)):
        raise ValueError(f"{path}: unexpected RGB sample outside [0, 1]")
    rgb = bytearray()
    for y in range(0, HEIGHT, SCALE):
        rows = [(y + row) * WIDTH for row in range(SCALE)]
        for x in range(0, WIDTH, SCALE):
            rgb.extend(srgb(sum(sum(channel[row + x:row + x + SCALE]) for row in rows) / SCALE**2)
                       for channel in (red, green, blue))
    return bytes(rgb)


def identical_gray_pixels(a, b, dx, dy):
    """Count fixed grayscale land/reference texture matches at each trial translation."""
    matched = 0
    for y in range(max(0, -dy), min(OUT_HEIGHT, OUT_HEIGHT - dy)):
        for x in range(max(0, -dx), min(OUT_WIDTH, OUT_WIDTH - dx)):
            i = (y * OUT_WIDTH + x) * 3
            j = ((y + dy) * OUT_WIDTH + x + dx) * 3
            pixel = a[i:i + 3]
            if pixel[0] == pixel[1] == pixel[2] and pixel == b[j:j + 3]:
                matched += 1
    return matched


def coastline_fit(rgb):
    """Estimate the seam against Natural Earth. This is a fit, not embedded georeferencing."""
    coastline = json.loads((ROOT.parents[1] / "src/data/world.json").read_text())["coastlines"]
    points = [(round(lon % 360 / 360 * OUT_WIDTH - .5) % OUT_WIDTH,
               round((90 - lat) / 180 * OUT_HEIGHT - .5))
              for ring in coastline for lon, lat in ring if -52 < lat < 52]
    gray = [max(rgb[i:i + 3]) - min(rgb[i:i + 3]) <= 4 for i in range(0, len(rgb), 3)]
    near = bytearray(OUT_WIDTH * OUT_HEIGHT)
    for y in range(4, OUT_HEIGHT - 4):
        for x in range(OUT_WIDTH):
            i = y * OUT_WIDTH + x
            if gray[i] == gray[y * OUT_WIDTH + (x + 1) % OUT_WIDTH] == gray[i + OUT_WIDTH]:
                continue
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    near[(y + dy) * OUT_WIDTH + (x + dx) % OUT_WIDTH] = 1
    scores = [sum(near[y * OUT_WIDTH + (x + shift) % OUT_WIDTH] for x, y in points)
              for shift in range(OUT_WIDTH)]
    best = max(range(OUT_WIDTH), key=scores.__getitem__)
    return {"points": len(points), "bestShiftPx": (best + OUT_WIDTH // 2) % OUT_WIDTH - OUT_WIDTH // 2,
            "best": scores[best], "zero": scores[0], "halfTurn": scores[OUT_WIDTH // 2]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    manifest = {"size": [OUT_WIDTH, OUT_HEIGHT], "frames": {}}
    decoded = []
    for date, expected in SOURCES.items():
        name = f"sst_mur_anomaly_pacific_{date}.exr"
        path = args.source_dir / f"{date}.exr"
        if sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f"{path}: EXR hash mismatch")
        rgb = decode(path)
        decoded.append(rgb)
        output = ROOT / "assets" / f"{date}.png"
        if args.write:
            subprocess.run([
                "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pixel_format", "rgb24",
                "-video_size", f"{OUT_WIDTH}x{OUT_HEIGHT}", "-i", "-", "-frames:v", "1",
                "-color_trc", "iec61966-2-1", "-update", "1", str(output),
            ], input=rgb, check=True)
        checked = subprocess.check_output([
            "ffmpeg", "-v", "error", "-i", str(output), "-frames:v", "1", "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
        ])
        if checked != rgb:
            raise ValueError(f"{output}: PNG pixels differ from the derived RGB buffer")
        manifest["frames"][date] = {
            "sourceUrl": BASE + name, "sourceBytes": path.stat().st_size, "sourceSha256": expected,
            "pngSha256": sha256(output.read_bytes()).hexdigest(), "rgbSha256": sha256(rgb).hexdigest(),
            "coastlineFit": coastline_fit(rgb),
        }
    manifest["registration"] = {
        f"{dx},{dy}": identical_gray_pixels(*decoded, dx, dy)
        for dx, dy in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)]
    }
    if manifest["registration"]["0,0"] <= max(v for k, v in manifest["registration"].items() if k != "0,0"):
        raise ValueError("The unshifted match is not the strongest tested registration")
    path = ROOT / "provenance.json"
    if args.write:
        path.write_text(json.dumps(manifest, indent=2) + "\n")
    elif manifest != json.loads(path.read_text()):
        raise ValueError("The derived source manifest has changed")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
